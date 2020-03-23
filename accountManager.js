const strftime = require('strftime');
const database = require("./databaseInit");

database.run("CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, hash TEXT NOT NULL, salt TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, privilege INTEGER NOT NULL DEFAULT 0);", [], function(result) {
    newAccount("admin", "password", 100);
    getInformation("id", "username", "admin", function(id) {
        updatePrivilege(id, 100);
    });
});

function accountExists(usernameOrID, enabledCheck, next) {
    let query;
    if (usernameOrID === undefined) {
        if (next !== undefined) next(false);
        return;
    } else if (Number.isInteger(usernameOrID)) {
        query = "SELECT * FROM accounts WHERE id = ?";

    } else {
        query = "SELECT * FROM accounts WHERE lower(username) = ?";
    }
    if (enabledCheck) query += " AND enabled = 1";

    database.all(query, usernameOrID, function(result) {
        if (result.length === 1) {
            if (next !== undefined) next(true);
        } else {
            if (next !== undefined) next(false);
        }

    });
}

function getAccountsSummary(id, next) {
    getInformation("privilege", "id", id, function(privilege) {
        getInformation("username", "id", id, function(username) {
            database.all("SELECT id, username, enabled, privilege FROM accounts WHERE ? OR id = ? OR privilege < ? ORDER BY username COLLATE NOCASE", [username === "admin", id, privilege], function (results) {
                let resultsById = {};
                for (let result in results) {
                    if (results.hasOwnProperty(result)) {
                        result = results[result];
                        let id = result.id;
                        delete result[id];
                        resultsById[id] = result;
                    }
                }
                if (next !== undefined) next(results);
            });
        });
    });
}

function searchAccounts(query, next) {
    database.all("SELECT id, username FROM accounts WHERE username LIKE ?", "%" + query + "%", function (results) {
        let resultsById = {};
        for (let result in results) {
            if (results.hasOwnProperty(result)) {
                result = results[result];
                let id = result.id;
                delete result[id];
                resultsById[id] = result;
            }
        }
        if (next !== undefined) next(results);
    });
}

function getInformation(select, whereKey, whereValue, next) {
    database.get("SELECT " + select + " FROM accounts WHERE " + whereKey + " = ?", whereValue, function(result) {
        if (next !== undefined) next(result[select]);
    });
}


function nextID(next) {
    database.get("SELECT max(id) as id FROM accounts;", null, function(result) {
        if (result.id !== null) {
            if (next !== undefined) next(result.id + 1);
        } else {
            if (next !== undefined) next(0);
        }
    });
}

function newAccount(username, password, privilege, next) {
    accountExists(username, false, function(result) {
        if (result) {
            if (next !== undefined) next(false);
            return
        }

        const authorization = require("./authorization");
        let salt = authorization.generateSalt();
        let hash = authorization.getHash(password, salt);

        nextID(function(id) {
            database.run("INSERT INTO accounts (id, username, hash, salt, privilege) VALUES (?, ?, ?, ?, ?)", [id, username, hash, salt, privilege], function(result) {
                if (!result && username !== undefined && password !== undefined && privilege !== undefined) {
                    newAccount(username, password, privilege, next);
                } else if (next !== undefined) next(result);

            });
        });

    });
}

function deleteAccount(id, next) {
    accountExists(id, false, function(result) {
        getInformation("username", "id", id, function(username) {
            if (!result) {
                if (next !== undefined) next(false);
                return
            }

            database.run("DELETE FROM accounts WHERE id = ?", id, function (result) {
                if (next !== undefined) next(result);
            });
        })
    });
}

function enableAccount(id, next) {
    accountExists(id, false, function(result) {
        if (!result) {
            if (next !== undefined) next(false);
            return;
        }

        database.run("UPDATE accounts SET enabled = 1 WHERE id = ?", id, function(result) {
            if (next !== undefined) next(result);
        });

    });
}

function disableAccount(id, next) {
    accountExists(id, false, function(result) {
        if (!result) {
            if (next !== undefined) next(false);
            return;
        }

        database.run("UPDATE accounts SET enabled = 0 WHERE id = ?", id, function(result) {
            if (next !== undefined) next(result);
        });

    });
}

function updateUsername(id, newUsername, next) {
    getInformation("username", "id", id, function(username) {
        if (username === "admin" || newUsername === "admin") {
            if (next !== undefined) next(false);
            return;
        }

        accountExists(newUsername, false, function(result) {
            if (result) {
                if (next !== undefined) next(false);
                return;
            }

            database.run("UPDATE accounts SET username = ? WHERE id = ?", [newUsername, id], function(result) {
                if (next !== undefined) next(result);
            });
        });
    });

}

function updatePassword(id, newPassword, next) {
    accountExists(id, false, function(result) {
        if (!result) {
            if (next !== undefined) next(false);
            return;
        }

        const authorization = require("./authorization");
        let newSalt = authorization.generateSalt();
        let newHash = authorization.getHash(newPassword, newSalt);

        database.run("UPDATE accounts SET hash = ?, salt = ? WHERE id = ?", [newHash, newSalt, id], function(result) {
            if (next !== undefined) next(result);
        });
    });
}

function updatePrivilege(id, newPrivilege, next) {
    if (newPrivilege >= 100) newPrivilege = 100;
    accountExists(id, false, function(result) {
        if (!result) {
            if (next !== undefined) next(false);
            return;
        }

        database.run("UPDATE accounts SET privilege = ? WHERE id = ?", [newPrivilege, id], function(result) {
            if (next !== undefined) next(result);
        });

    });
}

function log(req, text) {
    if (typeof req === "string") {
        text = req;
        console.log("[Account Manager] [" + strftime("%H:%M:%S") + "]: " + text);
    } else {
        console.log("[Account Manager] [" + strftime("%H:%M:%S") + "] [" + (req.ip) + "]: " + req.method + " " + text);
    }
}

module.exports = {
    accountExists: accountExists,
    getAccountsSummary: getAccountsSummary,
    searchAccounts: searchAccounts,
    getInformation: getInformation,
    newAccount: newAccount,
    deleteAccount: deleteAccount,
    enableAccount: enableAccount,
    disableAccount: disableAccount,
    updateUsername: updateUsername,
    updatePassword: updatePassword,
    updatePrivilege: updatePrivilege,
};