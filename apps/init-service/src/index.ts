import express from "express"
import cors from "cors"
import { copyS3Folder } from "@repo/awss3/S3"

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

//health check endpoint
app.get("/health", (req, res) => {
  res.send("OK")
})

app.post("/project", async (req, res) => {
  //Hit the DB to ensure this slug isn't taken
  const { replId, language } = req.body

  if (!replId) {
    return res.status(400).send("Bad Request!")
  }

  await copyS3Folder(`base/${language}`, `code/${replId}`)
  res.send("Project created")
})

app.listen(port, () => {
  console.log(`Listening on port: ${port}`)
})  