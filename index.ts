import moment from "moment";
import * as fs from "fs";
import { parse } from 'csv-parse/sync';
import log4js from "log4js";
import * as readline from "readline";

const logger : log4js.Logger = log4js.getLogger("index.ts");
log4js.configure({
    appenders: {
        file: { type: 'fileSync', filename: 'logs/debug.log' }
    },
    categories: {
        default: { appenders: ['file'], level: 'debug'}
    }
});

let readlineSync = require('readline-sync');

class Account {
    readonly personName : string;
    toGive : number;
    toReceive : number;
    constructor(theName : string) {
        this.personName = theName;
        this.toGive = this.toReceive = 0;
    }
     addMoneyToReceive(amount : number) : void {
        this.toReceive += amount;
     }

     addMoneyToGive(amount : number) : void {
        this.toGive += amount;
     }

     getPersonName() : string {
        return this.personName;
     }
}

class Payment {
    readonly receiverAccount : Account | undefined;
    readonly giverAccount : Account | undefined;
    readonly amount : number;
    readonly date : moment.Moment;
    readonly narrative : string;

    constructor(receiver: Account | undefined, giver: Account | undefined, amount: number, date: moment.Moment, narrative: string) {
        this.receiverAccount = receiver;
        this.giverAccount = giver;
        this.amount = amount;
        this.date = date;
        this.narrative = narrative;
    }

    getReceiverAcc() : Account | undefined {
        return this.receiverAccount;
    }

    getGiverAcc() : Account | undefined {
        return this.giverAccount;
    }
}

let payments : Payment[] = [];
let accounts : Map<string, Account> = new Map<string, Account>;

function processQuery() : void {
    let currentCommand : string = readlineSync.question("New command? ");
    if (currentCommand === "List All") {
        accounts.forEach(function(account : Account) : void {
            console.log(account);
        });
    } else {
        if (currentCommand.split(" ")[0] !== "List") {
            if (currentCommand.split(" ").slice(0, 2).join(" ") === "Import File") {
                let filePath : string = currentCommand.split(" ")[2];
                if (filePath.endsWith(".json")) {
                    parseJSON(filePath);
                } else if (filePath.endsWith(".csv")) {
                    console.log(filePath);
                    parseCSV(filePath);
                } else {
                    throw new Error("Invalid file format.");
                }
            } else {
                throw new Error("Invalid command!");
            }
        } else {
            let accountName : string = currentCommand.split(" ").slice(1).join(" ");
            if (!accounts.has(accountName)) {
                throw new Error("Invalid account name! Please introduce another command.\n");
            } else {
                payments.filter(function(payment : Payment) : boolean {
                    return payment.getGiverAcc()?.getPersonName() === accountName || payment.getReceiverAcc()?.getPersonName() === accountName;
                }).forEach((function(payment : Payment) : void {
                    console.log(payment);
                }));
            }
        }
    }
}
function processQueries() : void {
    console.log("Enter a command from the following:\n:" +
        "1. List All\n" +
        "2. List [Account])\n" +
        "3. Import File [filename] (either in JSON or in CSV format)"
    );
    while (true) {
        processQuery();
    }
}

function processPayment(receiverAccountName : string, giverAccountName : string, amount : number, date : moment.Moment, narrative: string) : void {
    if (!accounts.has(receiverAccountName)) {
        accounts.set(receiverAccountName, new Account(receiverAccountName));
    }
    if (!accounts.has(giverAccountName)) {
        accounts.set(giverAccountName, new Account(giverAccountName));
    }

    if (isNaN(amount)) {
        logger.error("Invalid number: " + amount);
        amount = 0;
    }
    accounts.get(receiverAccountName)?.addMoneyToReceive(amount);
    accounts.get(giverAccountName)?.addMoneyToGive(amount);

    if (!date.isValid()) {
        logger.error("Invalid date format!");
    }

    payments.push(new Payment(
        accounts.get(receiverAccountName),
        accounts.get(giverAccountName),
        amount,
        date,
        narrative));
}
function parseJSON(filePath : string) : void {
    const JSONString : string = fs.readFileSync(filePath, 'utf-8');
    const JSONData = JSON.parse(JSONString);
    JSONData.forEach(function (payment : any) : void {
        processPayment(payment["ToAccount"], payment["FromAccount"], payment["Amount"], moment(payment["Date"]).utcOffset(payment["Date"]), payment["Narrative"]);
    });
    console.log(payments);
}
function parseCSV(filePath : string)  {
    const CSVHeaders : string[] = ['Date', 'From', 'To', 'Narrative', 'Amount'];

    const CSVString : string = fs.readFileSync(filePath, 'utf-8');
    const CSVData = parse(CSVString, { delimiter: ",", columns: CSVHeaders, fromLine: 2});
    CSVData.forEach(function (payment : any) : void {
        processPayment(payment['To'], payment['From'], Number(payment['Amount']), moment(payment['Date'], "DD/MM/YYYY"), payment['Narrative']);
    });

}

processQueries();
