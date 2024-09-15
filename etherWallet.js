require('dotenv').config();
const { JsonRpcProvider, ethers} = require('ethers');
const DB = require('./database');

//  const provider = new JsonRpcProvider(process.env.INFURA_API_URL);
 const provider = new JsonRpcProvider(process.env.INFURA_API_URL2);

//  const provider = new ethers.JsonRpcProvider(`https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`);  // Infura API key for Goerli network

 async function createWallet(user_id, user_name) {
   const wallet = ethers.Wallet.createRandom();
   const { address, privateKey } = wallet;
 
   // Save the wallet information to the database
   const connection = await DB.getConnection();
   try {
     await connection.query('INSERT INTO wallets (user_id, user_name, address, private_key) VALUES (?, ?, ?, ?)', [user_id, user_name, address, privateKey]);
   } finally {
     connection.release();
   }
 
   return { address, privateKey };
 }
 

// Get wallet balance
async function getWalletBalance(address) {
  const balance = await provider.getBalance(address);
  
  const serializedData = JSON.stringify({
      success: true,
      balance: balance.toString() // Convert BigInt to string
  });
  
  return serializedData;
  
//   return ethers.utils.formatEther(balance);
}

                 // Transfer ether
async function transferEther(fromAddress, privateKey, toAddress, amountInEther) {
  const wallet = new ethers.Wallet(privateKey, provider);
  const tx = await wallet.sendTransaction({
    to: toAddress,
    value: ethers.utils.parseEther(amountInEther),
  });
  await tx.wait();

  return tx;
}

// Deposit ether (record the deposit transaction)
// async function recordDeposit(user_id,address, amount) {
//   const connection = await DB.getConnection();
//   try {
//     await connection.query('INSERT INTO deposits (user_id, address, amount) VALUES (?, ?)', [address, amount]);
//   } finally {
//     connection.release();
//   }
// }


// Deposit ether and record the transaction
async function recordDeposit(user_id, address, amount) {
  const connection = await DB.getConnection();
  // console.log(ethers)
  try {
    // Check if the user exists
    const [rows] = await connection.query('SELECT * FROM wallets WHERE user_id = ?', [user_id]);
    if (rows.length === 0) {
      throw new Error('User not found');
    }

    // Get the user's wallet info
    const userWallet = rows[0].address;
    
    // Prepare the transaction
    const tx = {
      to: address,
      value: ethers.parseEther(amount.toString()),  // Convert amount to wei
      gasLimit: 21000,  // Typical gas limit for a standard transaction
    };

    // Send the transaction
    //  const provider2 = new JsonRpcProvider("https://sepolia.infura.io/v3/6308e7cf1256493e8f39421f986716d1")
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY,provider);
    const txResponse = await wallet.sendTransaction(tx);

    // Wait for the transaction to be mined
    const txReceipt = await txResponse.wait();

    // Record the deposit in the database
    await connection.query(
      'INSERT INTO deposits (user_id, tx_hash, amount) VALUES (?, ?, ?)',
      [user_id, txReceipt.transactionHash, amount]
    );

    return { success: true, tx_hash: txReceipt.transactionHash };

  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    connection.release();
  }
}



// Assuming deposits and withdrawals tables are in place with wallet addresses
async function getAllWalletProfits() {
  const connection = await DB.getConnection();
  try {
    // Query to get wallet info and calculate total deposits and withdrawals
    const [rows] = await connection.query(`
      SELECT 
        w.user_id,
        w.address,
        w.private_key,
        COALESCE(SUM(d.amount), 0) AS total_deposits
      FROM 
        wallets w
      LEFT JOIN 
        deposits d ON w.user_id = d.user_id
      GROUP BY 
        w.user_id, w.address, w.private_key;
    `);

    // Return the results
    return rows;
  } catch (error) {
    console.error('Error fetching wallet profits:', error);
    throw error;
  } finally {
    connection.release();
  }
}


module.exports = { createWallet, getWalletBalance, transferEther, recordDeposit, getAllWalletProfits };


