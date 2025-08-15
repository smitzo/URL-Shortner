import express from "express" ;
const app = express()

const PORT = 5000;

app.get("/", (req,res)=>{
    res.send("Hi");
})

app.listen(5000, ()=>{
    console.log(`Server running at http://localhost:${PORT}`)
})