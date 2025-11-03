import "express";

declare module "express" {
  export interface Request {
    cookies?: {
      token?: string;
      [key: string]: string | undefined;
    };
  }
}
