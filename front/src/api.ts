import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true, 

});

api.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";

