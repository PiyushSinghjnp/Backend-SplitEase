import {Request,Response} from 'express';
import prisma from '../utils/prismaClient';

export const searchUsers  = async(req:Request,res:Response):Promise<void>=>{
    try{
        const query = req.query.user as string;
        if(!query || query.trim() === ''){
            res.status(400).json({error:'Seach Query is required'});
            return;
        }
        const users = await prisma.user.findMany({
            where: {
              OR: [
                {
                  username: {
                    contains: query,
                    mode: "insensitive", // case insensitive search
                  },
                },
                {
                  email: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              ],
            },
            take: 10,
            select: {
              id: true,
              username: true,
              email: true, // include email now that you're searching by it
            },
          });
        res.json({users});
    }
    catch(error){
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }

}