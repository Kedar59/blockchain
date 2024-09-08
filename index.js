"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = __importStar(require("crypto"));
class UTXO {
    constructor(txid, // Transaction ID
    index, // Output index
    address, // Owner's address (public key)
    amount // Amount in the output
    ) {
        this.txid = txid;
        this.index = index;
        this.address = address;
        this.amount = amount;
    }
}
class Transaction {
    // constructor(
    //   public amount: number,
    //   public payer: string, //public key
    //   public payee: string //public key
    // ) {}
    constructor(inputs, // Use UTXOs as inputs
    outputs // Create new UTXOs as outputs
    ) {
        this.inputs = inputs;
        this.outputs = outputs;
    }
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
    constructor() {
        this.utxos = [];
    }
    addUTXO(utxo) {
        this.utxos.push(utxo);
    }
    removeUTXO(txid, index) {
        this.utxos = this.utxos.filter(utxo => !(utxo.txid === txid && utxo.index === index));
    }
    findUTXOs(address) {
        return this.utxos.filter(utxo => utxo.address === address);
    }
}
class Block {
    constructor(prevHash, transaction, ts = Date.now()) {
        this.prevHash = prevHash;
        this.transaction = transaction;
        this.ts = ts;
        // 1 transaction per block
        this.nonce = Math.round(Math.random() * 999999999);
        this.Hash = "";
    }
    get hash() {
        const str = JSON.stringify(this);
        const hash = crypto.createHash("SHA256");
        hash.update(str).end();
        this.Hash = hash.digest("hex");
        return this.Hash;
    }
    toString() {
        return JSON.stringify(this);
    }
}
class Chain {
    constructor() {
        this.chain = [new Block("", new Transaction([], []))];
    }
    get lastBlock() {
        return this.chain[this.chain.length - 1];
    }
    mine(nonce) {
        let solution = 1;
        console.log("⛏️  mining...");
        while (true) {
            const hash = crypto.createHash('MD5');
            hash.update((nonce + solution).toString()).end();
            const attempt = hash.digest('hex');
            if (attempt.substring(0, 4) === "0000") {
                console.log(`Solved ${solution}`);
                return solution;
            }
            solution += 1;
        }
    }
    addBlock(transaction, senderPublicKey, signature) {
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
        this.chain[this.chain.length - 1].hash;
    }
    findWallet(publicKey) {
        return Wallet.wallets.find(wallet => wallet.publicKey === publicKey);
    }
}
Chain.instance = new Chain();
Chain.utxoPool = new UTXOPool();
class Wallet {
    constructor(balance, name) {
        this.balance = 0;
        this.name = name;
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
    getBalance() {
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
    grantInitialUTXO(balance) {
        if (balance > 0) {
            const initialUTXO = new UTXO(crypto.randomUUID(), 0, this.publicKey, balance);
            Chain.utxoPool.addUTXO(initialUTXO);
            this.balance = balance;
            console.log(`${this.name} granted initial balance of ${balance} through UTXO.`);
        }
        else {
            console.log("Initial balance must be greater than 0.");
        }
    }
    sendMoney(amount, payeePublicKey) {
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
        const inputs = [];
        for (const utxo of myUTXOs) {
            inputs.push(utxo);
            total += utxo.amount;
            if (total >= amount)
                break;
        }
        if (total < amount) {
            console.log("Insufficient funds");
            return;
        }
        const outputs = [
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
    depositMoney(amount) {
        this.balance += amount;
        console.log(`Deposited ${amount} to wallet. New balance: ${this.balance}`);
    }
    printWallet() {
        console.log(`======= Wallet of ${this.name} =======`);
        this.getBalance();
        console.log(`current balance : ${this.balance}`);
        console.log(`public key : ${this.publicKey}`);
        console.log(`======= END =======`);
    }
    static printAllWallets() {
        for (const wallet of Wallet.wallets) {
            wallet.printWallet();
        }
    }
}
Wallet.wallets = [];
const satoshi = new Wallet(100, "satoshi");
const bob = new Wallet(100, "alice");
const alice = new Wallet(100, "bob");
satoshi.sendMoney(50, bob.publicKey);
bob.sendMoney(23, alice.publicKey);
alice.sendMoney(5, bob.publicKey);
console.log(Chain.instance);
Wallet.printAllWallets();
