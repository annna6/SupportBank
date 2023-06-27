import moment from "moment";
import * as fs from "fs";
import { parse } from 'csv-parse';
import log4js from "log4js";


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

function processQueries(accounts : Map<string, Account>, payments : Payment[]) : void {
    console.log("Enter command. (List All OR List [Account])");
    let readlineSync = require('readline-sync');

    while (true) {
        let currentCommand : string = readlineSync.question("New command? ");
        console.log(currentCommand);
        if (currentCommand === "List All") {
            accounts.forEach(function(account : Account) : void {
                console.log(account);
            });
        } else {
            if (currentCommand.split(" ")[0] !== "List") {
                console.log("Invalid Command!");
                continue;
            } else {
                let accountName : string = currentCommand.split(" ").slice(1).join(" ");
                if (!accounts.has(accountName)) {
                    console.log("Invalid account name! Please introduce another command.\n");
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
}
const CSVHeaders : string[] = ['Date', 'From', 'To', 'Narrative', 'Amount'];
let parsedPayments : Payment[] = [];
let accounts : Map<string, Account> = new Map<string, Account>;

fs.createReadStream("./Transactions2014.csv")
    .pipe(parse({ delimiter: ",", columns: CSVHeaders, fromLine: 2}))
    .on("data", function(row : any): void {
        let receiverAccountName : string = row[CSVHeaders[1]];
        if (!accounts.has(receiverAccountName)) {
            accounts.set(receiverAccountName, new Account(receiverAccountName));
        }
        let giverAccountName : string = row[CSVHeaders[2]];
        if (!accounts.has(giverAccountName)) {
            accounts.set(giverAccountName, new Account(giverAccountName));
        }

        let amount : number = Number(row[CSVHeaders[4]]);
        accounts.get(receiverAccountName)?.addMoneyToReceive(amount);
        accounts.get(giverAccountName)?.addMoneyToGive(amount);

        parsedPayments.push(new Payment(
            accounts.get(receiverAccountName),
            accounts.get(giverAccountName),
            Number(row[CSVHeaders[4]]),
            moment(row[CSVHeaders[0]], 'DD/MM/YYYY'),
            row[CSVHeaders[3]]));
    })
    .on("end", () : void => {
        processQueries(accounts, parsedPayments);
    });






