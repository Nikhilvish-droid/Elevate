const express = require('express');
const dotenv = require('dotenv').config();
const app = express();

const port = process.env.PORT || 5000;


app.listen(port, () => {
    console.log(`backend is running smoothly on ${port}`);
})

app.get('/health', (req, res) => {
    res.json({
        message:"backend health is good",
        PORT:5000
    })
})