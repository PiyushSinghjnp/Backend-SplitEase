import prisma from './prismaClient'

// updates the balances between the user after an expense is created or modified

export async function updateBalancesForExpense(expenseId: string, recalculateAll: boolean = false) :Promise<void>{

    const expense = await prisma.expense.findUnique({
        where:{id:expenseId},
        include:{                                // join with the group table and the user table 
            paidBy:true,
            group: true,
            splits:{
                include:{                             // join with the user table 
                    user:true
                }
            }
        }
    })
 if(!expense){
    throw new Error('Expense not found')
 }
 // If we need to recalculate all balances for the group
 // we have to recalculate the balance when ther will be change in any of the expense amount or splitting type 
 if(recalculateAll){
    await recalculateGroupBalances(expense.groupId);
    return;
 }
 // For each split, update the balance between payer and debtor
 for(const split of expense.splits){
    // Skip if the payer is also the split owner (user paid for themselves)
    if(split.userId === expense.paidById){
        continue;
    }

    const shareAmount = parseFloat(split.share.toString());
    // Check if a balance record already exists
    const existingBalance = await prisma.balance.findFirst({
        where:{
            groupId:expense.groupId,
            lenderId : expense.paidById,
            borrowerId: split.userId
        }
    })

    // first check for every user that the borrroweing or lending realtionship exists between them or not 
    if(existingBalance){
        // update the existing balance
        const newAmount = parseFloat(existingBalance.amount.toString()) + shareAmount; // add to the existing amount if new expense is created
        await prisma.balance.update({
            where:{id:existingBalance.id},
            data:{
                amount : newAmount
            }
        })
    }
    else{
        // Check if there's a reverse balance (borrower is lending to the payer)
        // checking if earlier some one have paid for me then chck and subtract between it and what i am paying  
        const reverseBalance = await prisma.balance.findFirst({
            where:{
                groupId:expense.groupId,
                lenderId: split.userId,
                borrowerId: expense.paidById
            }
        })
        if(reverseBalance){
            const reverseAmount = parseFloat(reverseBalance.amount.toString());
            // If reverse amount is greater, reduce it
            if(reverseAmount > shareAmount){
                await prisma.balance.update({
                    where:{id:reverseBalance.id},
                    data:{
                        amount:reverseAmount - shareAmount
                    }
                });
            }
             // If reverse amount is smaller, delete it and create a new balance in the opposite direction
            else{
                const difference = shareAmount- reverseAmount;
                // Delete the reverse balance
                await prisma.balance.delete({
                    where:{id:reverseBalance.id}
                });
                // create a new balance if the difference is not zero
                if(difference > 0){
                    await prisma.balance.create({
                        data:{
                            groupId: expense.groupId,
                            lenderId: expense.paidById,
                            borrowerId: split.userId,
                            amount : difference
                        }
                    });
                }
            }
        }else {
            // Create a new balance record
            await prisma.balance.create({
              data: {
                groupId: expense.groupId,
                lenderId: expense.paidById,
                borrowerId: split.userId,
                amount: shareAmount
              }
            });
          }
        }
    }
}

//----------------- Removes balances related to a specific expense


export async function removeBalancesForExpense(expenseId:string):Promise<void>{
    const expense = await prisma.expense.findUnique({
        where:{id:expenseId},
        include:{
            splits:true
        }
    });
    if(!expense){
        throw new Error('Expense not found');
    }
    await recalculateGroupBalances(expense.groupId);

}
// -----------Recalculates all balances for a group from scratch
export async function recalculateGroupBalances(
    groupId: string
  ): Promise<void> {
    // Delete all existing balances for this group
    await prisma.balance.deleteMany({
      where: { groupId }
    });
  
    // Get all expenses for this group
    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: {
        splits: true,
        paidBy: true
      }
    });
  
    // Create a map to store the temporary balances
    const balanceMap = new Map<string, Map<string, number>>();
    
    // Process each expense to calculate net balances
    for (const expense of expenses) {
      const paidById = expense.paidById;
      
      // Initialize the payer's balance map if it doesn't exist
      if (!balanceMap.has(paidById)) {
        balanceMap.set(paidById, new Map<string, number>());
      }
      
      // Process each split
      for (const split of expense.splits) {
        const userId = split.userId;
        
        // Skip if the user is the payer
        if (userId === paidById) {
          continue;
        }
        
        // Initialize the user's balance map if it doesn't exist
        if (!balanceMap.has(userId)) {
          balanceMap.set(userId, new Map<string, number>());
        }
        
        const shareAmount = parseFloat(split.share.toString());
        
        // Update the balance between payer and user
        const payerBalances = balanceMap.get(paidById)!;
        const userBalances = balanceMap.get(userId)!;
        
        // Add to payer's balance (they are owed money)
        payerBalances.set(userId, (payerBalances.get(userId) || 0) + shareAmount);
        
        // Subtract from user's balance (they owe money)
        userBalances.set(paidById, (userBalances.get(paidById) || 0) - shareAmount);
      }
    }
    
    // Create balance records in the database
    for (const [lenderId, borrowerMap] of balanceMap) {
      for (const [borrowerId, amount] of borrowerMap) {
        // Only create a balance record if the amount is not zero
        if (amount !== 0) {
          await prisma.balance.create({
            data: {
              groupId,
              lenderId,
              borrowerId,
              amount: Math.abs(amount)
            }
          });
        }
      }
    }
  }

export async function getUserBalancesInGroup(
  userId: string,
  groupId: string
): Promise<{
  youOwe: Array<{
    userId: string;
    username: string;
    amount: number;
  }>;
  youAreOwed: Array<{
    userId: string;
    username: string;
    amount: number;
  }>;
}> {
  // Get all balances where user is either lender or borrower
  const balances = await prisma.balance.findMany({
    where: {
      groupId,
      OR: [
        { lenderId: userId },
        { borrowerId: userId }
      ]
    },
    include: {
      lender: {
        select: {
          id: true,
          username: true
        }
      },
      borrower: {
        select: {
          id: true,
          username: true
        }
      }
    }
  });

  const youOwe: Array<{
    userId: string;
    username: string;
    amount: number;
  }> = [];
  const youAreOwed: Array<{
    userId: string;
    username: string;
    amount: number;
  }> = [];

  // Process each balance
  for (const balance of balances) {
    const amount = parseFloat(balance.amount.toString());

    if (balance.borrowerId === userId) {
      // User owes money to the lender
      youOwe.push({
        userId: balance.lenderId,
        username: balance.lender.username,
        amount
      });
    } else if (balance.lenderId === userId) {
      // User is owed money by the borrower
      youAreOwed.push({
        userId: balance.borrowerId,
        username: balance.borrower.username,
        amount
      });
    }
  }

  return {
    youOwe,
    youAreOwed
  };
}