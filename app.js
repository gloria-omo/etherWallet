const express = require('express');
const { JsonRpcProvider, ethers} = require('ethers');
const { createWallet, getWalletBalance, transferEther, recordDeposit, getAllWalletProfits} = require('./etherWallet');
const app = express();
const PORT = 4004

app.use(express.json());

   // Route to create a wallet
app.post('/create-wallet', async (req, res) => {
  const { user_id, user_name } = req.body;

  // Input validation
  if (!user_id || !user_name) {
    return res.status(400).json({ success: false, message: 'userId and userName are required' });
  }

  try {
    // Creating the wallet
    const wallet = await createWallet(user_id, user_name);
    res.status(200).json({ success: true, wallet });
  } catch (error) {
    console.error('Error creating wallet:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route to check balance of a wallet
app.get('/balance/:address', async (req, res) => {
  const { address } = req.params;
  try {
    const balance = await getWalletBalance(address);
    res.status(200).json({ success: true, balance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route to transfer ether from one wallet to another
app.post('/transfer', async (req, res) => {
  const { fromAddress, privateKey, toAddress, amount } = req.body;
  try {
    const tx = await transferEther(fromAddress, privateKey, toAddress, amount);
    res.status(200).json({ success: true, transaction: tx });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route to record ether deposit (to be called after a deposit)
// app.post('/deposit', async (req, res) => {
//   const { address, amount } = req.body;
//   try {
//     await recordDeposit(address, amount);
//     res.status(200).json({ success: true });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// });



 // Route to handle deposit
app.post('/deposit', async (req, res) => {
  const { user_id, amount, address } = req.body;

  try {
    // Make deposit and record transaction
    const result = await recordDeposit(user_id, address, amount);
    
    // Respond with success and transaction hash
    res.status(200).json({ success: true, tx_hash: result.tx_hash });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// Route to get all wallet profits
app.get('/wallet-profits', async (req, res) => {
  try {
    const profits = await getAllWalletProfits();
    res.status(200).json({ success: true, profits });
  } catch (error) {
    console.error('Error getting wallet profits:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
  

  app.listen(PORT, () => {
    console.log(`Server is listening to PORT: ${PORT}`);
  });