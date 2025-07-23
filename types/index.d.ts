export { };

declare global {
  namespace Express {
    interface Request {
      identity?: UserInfo;
      userInfo?: UserInfo;
    }
  }
}

type UserInfo = {
  id: string;
  email: string;
  picture: string;
  subs: string[];
  permissions: string[];
};
