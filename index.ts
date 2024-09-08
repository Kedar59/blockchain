import * as crypto from "crypto";
class UTXO {
  constructor(
    public txid: string,  // Transaction ID
    public index: number, // Output index
    public address: string,  // Owner's address (public key)
    public amount: number  // Amount in the output
  ) {}
}

class Transaction {
  // constructor(
  //   public amount: number,
  //   public payer: string, //public key
  //   public payee: string //public key
  // ) {}
  constructor(
    public inputs: UTXO[],  // Use UTXOs as inputs
    public outputs: UTXO[]  // Create new UTXOs as outputs
  ){}
  toString() {
    // return `{ /n
    //   amount : ${this.amount}, /n
    //   payer : ${this.payer.substring(0,100)}, /n
    //   payee : ${this.payee.substring(0,100)} /n
    // }/n`;
    return JSON.stringify(this);
  }
}
class UTXOPool {
  private utxos: UTXO[] = [];

  addUTXO(utxo: UTXO) {
    this.utxos.push(utxo);
  }

  removeUTXO(txid: string, index: number) {
    this.utxos = this.utxos.filter(utxo => !(utxo.txid === txid && utxo.index === index));
  }

  findUTXOs(address: string): UTXO[] {
    return this.utxos.filter(utxo => utxo.address === address);
  }
} 
class Block {
  // 1 transaction per block
  public nonce = Math.round(Math.random() * 999999999);
  public Hash:string;
  constructor(
    public prevHash: string,
    public transaction: Transaction,
    public ts = Date.now()
  ) {
    this.Hash="";
  }
  get hash() {
    const str = JSON.stringify(this);
    const hash = crypto.createHash("SHA256");
    hash.update(str).end();
    this.Hash = hash.digest("hex");
    return this.Hash;
  }
  toString(){
    return JSON.stringify(this);
  }
}

class Chain {
  public static instance = new Chain();
  public static utxoPool = new UTXOPool();
  chain: Block[];
  constructor() {
    this.chain = [new Block("", new Transaction([],[]))];
  }
  get lastBlock() {
    return this.chain[this.chain.length - 1];
  }
  mine(nonce: number) {
    let solution = 1;
    console.log("⛏️  mining...");
    while(true){
		const hash = crypto.createHash('MD5');
		hash.update((nonce+solution).toString()).end();
		const attempt = hash.digest('hex');
		if(attempt.substring(0,4)==="0000"){
			console.log(`Solved ${solution}`);	
			return solution;
		}
		solution+=1;
	}
  }
  addBlock(
    transaction: Transaction,
    senderPublicKey: string,
    signature: Buffer
  ) {
    const verifier = crypto.createVerify("SHA256");
    verifier.update(transaction.toString());
    const isValid = verifier.verify(senderPublicKey, signature);
    if (isValid) {
      const newBlock = new Block(this.lastBlock.hash, transaction);

      transaction.inputs.forEach(input => {
        Chain.utxoPool.removeUTXO(input.txid, input.index);
      });
      transaction.outputs.forEach(output => {
        Chain.utxoPool.addUTXO(output);
      });

      this.mine(newBlock.nonce);
      this.chain.push(newBlock);
    }
    this.chain[this.chain.length-1].hash;
  }
  findWallet(publicKey: string): Wallet | undefined {
    return Wallet.wallets.find(wallet => wallet.publicKey === publicKey);
  }
  // prettyPrint() {
  //   return JSON.stringify(this, (key, value) => {
  //     if (key === 'chain') {
  //       return value.map((block: Block) => ({
  //         prevHash: block.prevHash,
  //         transaction: {
  //           amount: block.transaction.amount,
  //           payer: block.transaction.payer.substring(28,100),
  //           payee: block.transaction.payee.substring(28,100)
  //         },
  //         ts: block.ts,
  //         nonce: block.nonce,
  //         hash: block.Hash
  //       }));
  //     }
  //     return value;
  //   }, 2);
  // }
}
class Wallet {
  public publicKey: string;
  public privateKey: string;
  public balance:number;
  public name:string;

  static wallets: Wallet[] = [];
  
  constructor(balance:number , name:string) {
    this.balance = 0;
    this.name=name;
    const keyPair = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    this.privateKey = keyPair.privateKey;
    this.publicKey = keyPair.publicKey;


    Wallet.wallets.push(this);
    this.grantInitialUTXO(balance);
    
  }
  getBalance(): number {
    // Find all UTXOs associated with this wallet's public key
    const myUTXOs = Chain.utxoPool.findUTXOs(this.publicKey);
  
    // Calculate the total balance by summing the UTXO amounts
    const totalBalance = myUTXOs.reduce((total, utxo) => total + utxo.amount, 0);
  
    // Update this wallet's balance property
    this.balance = totalBalance;
  
    // Return the balance
    return this.balance;
  }
  // Method to grant initial UTXO to the user
  private grantInitialUTXO(balance: number) {
    if (balance > 0) {
      const initialUTXO = new UTXO(crypto.randomUUID(), 0, this.publicKey, balance);
      Chain.utxoPool.addUTXO(initialUTXO);
      this.balance=balance;
      console.log(`${this.name} granted initial balance of ${balance} through UTXO.`);
    } else {
      console.log("Initial balance must be greater than 0.");
    }
  }
  sendMoney(amount: number, payeePublicKey: string) {
    // if(amount > this.balance){
    //   console.log(`Amount : ${amount} is greater than current balance : ${this.balance}`)
    //   return;
    // }
    // const transaction = new Transaction(amount, this.publicKey, payeePublicKey);

    // const sign = crypto.createSign("SHA256");
    // sign.update(transaction.toString()).end();

    // const signature = sign.sign(this.privateKey);
    // Chain.instance.addBlock(transaction, this.publicKey, signature);
    // this.balance-=amount;

    // const payeeWallet = Chain.instance.findWallet(payeePublicKey);
    // if (payeeWallet) {
    //   payeeWallet.depositMoney(amount);
    // } else {
    //   console.log(`Warning: Payee wallet with public key ${payeePublicKey} not found.`);
    // }
    const myUTXOs = Chain.utxoPool.findUTXOs(this.publicKey);
    let total = 0;
    const inputs: UTXO[] = [];

    for (const utxo of myUTXOs) {
      inputs.push(utxo);
      total += utxo.amount;
      if (total >= amount) break;
    }

    if (total < amount) {
      console.log("Insufficient funds");
      return;
    }

    const outputs: UTXO[] = [
      new UTXO(crypto.randomUUID(), 0, payeePublicKey, amount),
      new UTXO(crypto.randomUUID(), 1, this.publicKey, total - amount) // Change
    ];
    const transaction = new Transaction(inputs, outputs);

    // const sign = crypto.createSign("SHA256");
    // sign.update(transaction.toString()).end();

    // const signature = sign.sign(this.privateKey);
    // Chain.instance.addBlock(transaction, this.publicKey, signature);

    const sign = crypto.createSign("SHA256");
    sign.update(transaction.toString()).end();
    const signature = sign.sign(this.privateKey);
    Chain.instance.addBlock(transaction, this.publicKey, signature);
  }
  depositMoney(amount: number) {
    this.balance += amount;
    console.log(`Deposited ${amount} to wallet. New balance: ${this.balance}`);
  }
  printWallet(){
    console.log(`======= Wallet of ${this.name} =======`);
    this.getBalance();
    console.log(`current balance : ${this.balance}`);
    console.log(`public key : ${this.publicKey}`);
    console.log(`======= END =======`);
  }
  static printAllWallets(){
    for (const wallet of Wallet.wallets) {
      wallet.printWallet();
    }
  }
}


const satoshi = new Wallet(100,"satoshi");
const bob = new Wallet(100,"alice");
const alice = new Wallet(100,"bob");
satoshi.sendMoney(50,bob.publicKey);
bob.sendMoney(23,alice.publicKey);
alice.sendMoney(5,bob.publicKey);	

console.log(Chain.instance);
Wallet.printAllWallets();