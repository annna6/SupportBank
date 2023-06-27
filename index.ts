import moment from "moment";
import * as fs from "fs";
import { parse } from 'csv-parse';
import log4js from "log4js";
import {stringifier} from "csv";

const logger = log4js.getLogger("index.ts");
log4js.configure({
    appenders: {
        file: { type: 'fileSync', filename: 'logs/debug.log' }
    },
    categories: {
        default: { appenders: ['file'], level: 'debug'}
    }
});

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

function processQueries() : void {
    console.log("Enter a command from the following:\n:" +
        "1. List All\n" +
        "2. List [Account])\n" +
        "3. Import File [filename] (either in JSON or in CSV format)"
    );
    let readlineSync = require('readline-sync');

    while (true) {
        try {
            let currentCommand : string = readlineSync.question("New command? ");
            console.log(currentCommand);
            if (currentCommand === "List All") {
                accounts.forEach(function(account : Account) : void {
                    console.log(account);
                });
            } else {
                if (currentCommand.split(" ")[0] !== "List") {
                    if (currentCommand.split(" ").slice(0, 2).join(" ") === "Import File") {
                        let filePath = currentCommand.split(" ")[2];
                        if (filePath.endsWith(".json")) {
                            parseJSON(filePath);
                        } else if (filePath.endsWith(".csv")) {
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
        } catch (err) {
            console.log("Error caught: " + err);
        }
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

    console.log(payments);
}
function parseJSON(filePath : string) : void {
    const JSONString = fs.readFileSync(filePath, 'utf-8');
    const JSONData = JSON.parse(JSONString);
    JSONData.forEach(function (payment : any) : void {
        processPayment(payment["ToAccount"], payment["FromAccount"], payment["Amount"], moment(payment["Date"]).utcOffset(payment["Date"]), payment["Narrative"]);
    });
}
function parseCSV(filePath : string) : void {
    const CSVHeaders : string[] = ['Date', 'From', 'To', 'Narrative', 'Amount'];

    fs.createReadStream(filePath)
        .pipe(parse({ delimiter: ",", columns: CSVHeaders, fromLine: 2}))
        .on("data", function(row : any): void {
            processPayment(row['To'], row['From'], Number(row['Amount']), moment(row['Date'], "DD/MM/YYYY"), row['Narrative']);
        })
        .on("error", (err : Error): void => {
            console.log("Error: " + err + "------\n");
        })
        .on("end", () : void => {
            console.log("Finished reading csv");
        });
}

parseJSON("./Transactions2013.json");