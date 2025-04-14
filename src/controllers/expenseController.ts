import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import { CustomRequest } from '../types/customRequest';

export async function createExpense(req:CustomRequest,res:Response):Promise<void>{

    try{
        const {description,amount,groupId,splittingType,splits} = req.body;
        const userId = req.user?.userId;

        // now we should validata that group is exsting or not 
        const group  = await prisma.group.findUnique({
            where:{
                id:groupId
            },
            include:{
                members:true
            }
        })
        if(!group){
            res.status(404).json({
                message:"Group not found"
            })
            return;
        }
        // check if user is member of group or not 
        const isMember = group.members.some((member)=>member.userId === userId); // some() checks if at least one element satisfies the condition
        if(!isMember){
            res.status(403).json({
                message:"You are not a member of this group"
            })
        }
        // now we should create expense
        const expense = await prisma.expense.create({
            data:{
                description,
                amount: parseFloat(amount),
                paidById: userId,
                groupId
            }
        })
        // handling different splitting types
        if(splittingType === "Equal"){
            const memberCount = group.members.length;
            const shareAmount = amount / memberCount;
        // now we should make an object which contains the equal share amount for each member and then we insert into the table
            const splitData = group.members.map(member => ({
                expenseId: expense.id,
                userId: member.userId,
                share: shareAmount
            }))
            await prisma.expenseSplit.createMany({ // used createMany() because we are inserting multiple records at a time
                data:splitData
            });
        }
        else if(splittingType === "custom" && splits && Array.isArray(splits)){
            const SplitData = splits.map(split=>({
                expenseId : expense.id,
                userId : split.userId,
                share : split.share
            }));
            await prisma.expenseSplit.createMany({
                data:SplitData
            });
        }
        else{
            res.status(400).json({
                message:"Invalid splitting type or misssing splitting data"})
            return;
        }
        res.status(201).json({
            message: 'Expense created successfully',
            expense
        });
    }
    catch(error){
        console.error('Error creating expense:', error);
        res.status(500).json({ error: 'Failed to create expense' });
    }
}

export async function updateExpense(req:CustomRequest,res:Response):Promise<void>{
    try{
        const {expenseId} = req.params;
        const {description,amount,splittingType,splits} = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const expense = await prisma.expense.findUnique({
            where: { id: expenseId },
            include: {
                group: {                                    // its a method of join in prisma which is used to include the group information in the expense object
                    include: { members: true }
                },
                splits: true
            }
        });
        if (!expense) {
            res.status(404).json({ error: 'Expense not found' });
            return;
        }
        // update the expense basic details 
        const updatedExpense = await prisma.expense.update({
            where:{
                id:expenseId,
            },
            data : {
                description: description || expense.description,
                amount: amount ? parseFloat(amount) : expense.amount,
            }
        });

        // if the amount changed or splitting type changed then we should update the splits
        if(amount && amount !== expense.amount ||  splittingType){
            // delete the existing splits
            await prisma .expenseSplit.deleteMany({
                where:{
                    expenseId : expenseId
                }
            });
            if(splittingType === "Equal"){
                const memberCount = expense.group.members.length;
                const shareAmount = (amount || expense.amount) / memberCount;
                const splitData = expense.group.members.map(member=>({
                    expenseId,
                    userId:member.userId,
                    share:shareAmount
                }));
                await prisma.expenseSplit.createMany({
                    data: splitData
                });
            }
            else if (splittingType === "custom" && splits && Array.isArray(splits)){
                const splitData = splits.map(split=>({
                    expenseId,
                    userId:split.userId,
                    share:parseFloat(split.share)
                }));
                await prisma.expenseSplit.createMany({
                    data:splitData
                });
            }
           // what if the distribution is changed that some user give some money different than previous distribution
           //i.e user wants to update the individual split amounts without changing the splitting type.
            // then we should update the splits
            else if (!splittingType && splits && Array.isArray(splits)) {
                // Just update the splits without changing the splitting type
                const splitData = splits.map(split => ({
                    expenseId,
                    userId: split.userId,
                    share: parseFloat(split.share)
                }));

                await prisma.expenseSplit.createMany({
                    data: splitData
                });
            }
        }
        const finalExpense = await prisma.expense.findUnique({
            where: { id: expenseId },
            include: {    // join the user table with expense table
                paidBy: {
                    select: {
                        id: true,
                        username: true
                    }
                },
                splits: {         // join the user table with expenseSplit table    
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    }
                }
            }
        });
        res.json({
            message: 'Expense updated successfully',
            expense: finalExpense
        });
    }
    catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ error: 'Failed to update expense' });
    }
}
export async function deleteExpense(req:CustomRequest,res:Response):Promise<void>{
    try{
        const {expenseId} = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        // find the expense exists or not 
        const expense  = await prisma.expense.findUnique({
            where:{
                id:expenseId
            }
        })
        if (!expense) {
            res.status(404).json({ error: 'Expense not found' });
            return;
        }
        // before deleting the expense we should delete the expense splits which is related to this expense
        await prisma.expenseSplit.deleteMany({
            where:{
                expenseId:expenseId
            }
        })
        // now delete the expense
        await prisma.expense.delete({
            where:{
                id:expenseId
            }
        })
        res.json({
            message:"Expense deleted Successfully"
        })
    } 
    catch(error){
        console.error('Error deleting expense:', error);
        res.status(500).json({ error: 'Failed to delete expense' });
    }
}

export async function getGroupExpenseSummary(req:CustomRequest,res:Response):Promise<void>{
    try{
        
    } 
    catch(error){
        console.error('Error getting group expense summary:', error);
        res.status(500).json({ error: 'Failed to get group expense summary' });
    }
}

export async function getExpenseDetail(req:CustomRequest,res:Response):Promise<void>{
    try{
        
    } 
    catch(error){
        console.error('Error getting expense detail:', error);
        res.status(500).json({ error: 'Failed to get expense detail' });
    }
}