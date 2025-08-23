import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export function authRequired(req, res, next) {
  const auth = req.headers.authorization;
  if(!auth || !auth.startsWith('Bearer ')){
    return res.status(401).json({error:'Unauthorized'});
  }
  const token = auth.split(' ')[1];
  try{
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  }catch(e){
    return res.status(401).json({error:'Invalid token'});
  }
}