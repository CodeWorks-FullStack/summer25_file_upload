import { logger } from "./Logger.js";
import { dbContext } from "../db/DbContext.js";

export function createOpenAPISpec(controllers) {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
      description: 'Auto Generated API Documentation',
    },
    servers: [
      {
        url: 'http://localhost:' + process.env.PORT
      }
    ],
    paths: {}
  }


  logger.log('Generating OpenAPI Spec', controllers.length);
  const { paths, schemas } = generateSwaggerSpec(controllers);
  spec.paths = paths;
  const openApiSchemas = {};
  for (const [name, schema] of Object.entries(schemas)) {
    openApiSchemas[name] = schema;
  }



  spec.components = {
    schemas: openApiSchemas,
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    }
  };
  return spec;
}



function generateSwaggerSpec(controllers) {
  const paths = {};
  const schemas = extractSchemaInfo();
  logger.log('Schemas', Object.keys(schemas).length);

  for (const controller of controllers) {
    const basePath = controller.mount;
    const stack = controller.router.stack;

    let requiresAuth = false; // 🔥 Track when `.use(Auth0Provider.getAuthorizedUserInfo)` appears
    let permissions = []; // 🔥 Track applied permissions

    for (const layer of stack) {
      if (!layer.route) {
        // 🔥 If `.use(Auth0Provider.getAuthorizedUserInfo)`, set requiresAuth = true for subsequent routes
        const middlewareSecurity = extractSecurityFromMiddleware([layer]);
        if (middlewareSecurity.requiresAuth) {
          requiresAuth = true; // 🔥 Lock future routes
        }
        if (middlewareSecurity.permissions.length > 0) {
          permissions = [...new Set([...permissions, ...middlewareSecurity.permissions])];
        }
        continue;
      }

      const routePath = basePath + layer.route.path;
      const methods = Object.keys(layer.route.methods);
      const handler = layer.route.stack[layer.route.stack.length - 1].handle;

      // 🔥 Extract per-route security
      const routeSecurity = extractSecurityFromMiddleware(layer.route.stack);

      // 🔥 Merge per-route security with controller-wide security AFTER `.use()`
      const finalRequiresAuth = requiresAuth || routeSecurity.requiresAuth;
      const finalPermissions = [...new Set([...permissions, ...routeSecurity.permissions])];

      methods.forEach(method => {
        if (!paths[routePath]) paths[routePath] = {};

        const statusCodes = extractStatusCodes(handler);
        const schemaName = Object.keys(schemas).find(s => routePath.includes(s.toLowerCase()));
        const responseSchemaRef = schemaName ? { "$ref": `#/components/schemas/${schemaName}` } : undefined;

        const securityDefinition = finalRequiresAuth ? [{ "bearerAuth": [] }] : undefined;

        paths[routePath][method] = {
          summary: `${handler.name}`,
          description: `Auto-generated documentation`,
          security: securityDefinition,
          "x-permissions": finalPermissions.length > 0 ? finalPermissions : undefined,
          requestBody: method !== "get" && schemaName
            ? {
              required: true,
              content: {
                "application/json": {
                  schema: { "$ref": `#/components/schemas/${schemaName}` }
                }
              }
            }
            : undefined,
          responses: Object.fromEntries(statusCodes.map(code => [
            code,
            {
              description: `Response for status ${code}`,
              content: responseSchemaRef
                ? { "application/json": { schema: responseSchemaRef } }
                : undefined
            }
          ]))
        };
      });
    }
  }

  return { paths, schemas };
}



function extractStatusCodes(handler) {
  const fnString = handler.toString();
  const statusCodes = [];
  const regex = /res\.status\((\d{3})\)/g;
  let match;

  while ((match = regex.exec(fnString)) !== null) {
    statusCodes.push(Number(match[1]));
  }

  return statusCodes.length ? statusCodes : [200];
}
function extractSchemaInfo() {
  const schemas = {};

  for (const modelName in dbContext) {
    const model = dbContext[modelName];
    if (!model || !model.schema) continue;

    const schemaInfo = {
      type: "object",
      properties: {},
      required: []
    };

    for (const field in model.schema.paths) {
      if (field === '__v') continue;
      const path = model.schema.paths[field];
      let fieldType = path.instance.toLowerCase();


      if (fieldType === 'objectid') fieldType = 'string';
      if (fieldType === 'date') fieldType = 'string';

      if (path.instance === 'Array') {
        schemaInfo.properties[field] = {
          type: "array",
          items: { type: "string" } // Default to string unless we detect a nested schema
        };

        if (path.caster && path.caster.instance) {
          schemaInfo.properties[field].items.type = path.caster.instance.toLowerCase();
          if (schemaInfo.properties[field].items.type === "objectid") {
            schemaInfo.properties[field].items.type = "string";
          }
        }
      }
      // Handle Other Types
      else {
        schemaInfo.properties[field] = { type: fieldType };
      }

      if (path.isRequired) {
        // @ts-ignore
        schemaInfo.required.push(field);
      }
    }


    for (const virtualField in model.schema.virtuals) {
      const obj = model.schema.virtuals[virtualField];
      if (!obj) continue;
      const description = obj.options.localField
        ? `<pre>Virtual property: ${virtualField}\n<code>${JSON.stringify(obj.options, null, 2)}</code></pre>`
        : `Virtual property: ${virtualField}`;
      schemaInfo.properties['{' + virtualField + '}'] = {
        type: "string",
        description
      };
    }



    schemas[modelName] = schemaInfo;
  }

  schemas["Profile"] = schemas["Profile"] || {
    type: "object",
    properties: {
      "_id": { type: "string" },
      "name": { type: "string" },
      "picture": { type: "string" }
    },
    required: ["_id", "name"]
  };

  return schemas;
}


function extractSecurityFromMiddleware(routeStack) {
  let requiresAuth = false;
  let permissions = [];

  for (const layer of routeStack) {
    if (!layer.handle || typeof layer.handle !== "function") continue;

    const fnString = layer.handle.toString();

    // 🔥 Detect controller-wide JWT authentication middleware (.use(Auth0Provider.getAuthorizedUserInfo))
    if (fnString.includes("getAuthorizedUserInfo")) {
      requiresAuth = true;
    }

    // 🔥 Detect controller-wide permission-based middleware (.use(Auth0Provider.hasPermissions(...)))
    const permissionMatch = fnString.match(/hasPermissions\(([^)]+)\)/);
    if (permissionMatch) {
      let extractedPermissions = permissionMatch[1].trim();

      // If it's an array, clean it up
      if (extractedPermissions.startsWith("[")) {
        try {
          permissions = JSON.parse(extractedPermissions.replace(/'/g, '"')); // Convert to valid JSON
        } catch (e) {
          console.error("Error parsing permissions:", extractedPermissions, e);
        }
      } else {
        permissions.push(extractedPermissions.replace(/['"]/g, "")); // Remove quotes if single string
      }
    }
  }

  return { requiresAuth, permissions };
}



