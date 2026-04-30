import {Transloadit} from "transloadit";

export function getTransloadit() {
  if (!process.env.TRANSLOADIT_AUTH_KEY)   {
    throw new Error("Missing TRANSLOADIT_AUTH_KEY");
  }

  if (!process.env.TRANSLOADIT_SECRET) {
    throw new Error("Missing TRANSLOADIT_SECRET");
  }

  return new Transloadit({
    authKey: process.env.TRANSLOADIT_AUTH_KEY,
    authSecret: process.env.TRANSLOADIT_SECRET,
  });
}