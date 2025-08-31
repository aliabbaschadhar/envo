import express from 'express';
import cors from "cors";
import { createServer } from "http"

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;


app.use(cors())
app.use(express.json());

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});