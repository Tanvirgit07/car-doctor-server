const express = require('express');
const cors = require('cors');
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port =  process.env.PORT || 5000;


//middle ware 
app.use(cors({
  origin : ['http://localhost:5173'],
  credentials : true
}));
app.use(express.json());
app.use(cookieParser());


//create middleware
const logger = async(req,res,next) =>{
  console.log('called :' , req.host, req.originalUrl)
  next()
}


const verifyToken = (req,res,next) =>{
  
  const token = req.cookies?.token;
  console.log('value of token is : ',token)
  if(!token){
    return res.status(401).send({message : 'not authorized'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, (err,decoded) =>{
    //error 
    if(err) {
      console.log(err)
      return res.status(401).send({message : 'unauthorize'})
    }
    console.log('value in token' , decoded)
    req.user = decoded

    next();
  })
}

const uri = `mongodb+srv://${process.env.BD_USER}:${process.env.BD_PASS }@cluster0.j10pchd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

console.log(uri)

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db('caeData').collection('services')
    const orderCollection = client.db('caeData').collection('orderService');

    app.get('/service' , async(req,res) =>{
        const cursor = serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result)
    })


    app.get('/service/:id', logger, async(req,res) =>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};

        const options = {
          projection: { title: 1,price: 1,service_id: 1,img: 1 },
        };

        const result = await serviceCollection.findOne(query,options)
        res.send(result)
    })

    app.post('/order', logger,async (req,res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order)
      res.send(result)
    });

    app.get('/order' ,logger, verifyToken,async (req,res) =>{
      if(req.query.email !== req.user.email){
        return res.status(403).send({message : 'forbidden already'})
      }
      let query = {};
      // console.log('token',req.cookies.token)
      if(req.query?.email){
        query = {email:req.query.email}
      }
      const result = await orderCollection.find( query).toArray()
      res.send(result)
    })


    app.post('/jwt' ,async(req,res) =>{
      const user = req.body
      console.log(user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
      res
      .cookie('token',token, {
        httpOnly : true,
        secure : false, 
      })
      .send({success : true});
    })
    app.patch('/order/:id' , async(req,res) =>{
      const id = req.params.id;
      const filter = {_id : new ObjectId(id)};
      const updateOrder = req.body;
      const updateDoc ={
        $set : {
          status : updateOrder.status
        },
      }
      const result = await orderCollection.updateOne(filter,updateDoc);
      res.send(result);
    })
    
    app.delete('/order/:id' , async (req,res) =>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      console.log(id)
      const result = await orderCollection.deleteOne(query)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/',(req,res) =>{
    res.send('doctor is running')
})

app.listen(port, () =>{
    console.log(`car is running port ${port}`)
})