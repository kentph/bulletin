import { initObjectionModel } from "./objection/model";

// LOG
console.log("Database client:", process.env.REACT_APP_DB_CLIENT);

const model = initObjectionModel();

export default model;
