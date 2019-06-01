$(document).ready(function() {
    var main = $("#main_accounts");
    var accounts = $("#accounts");
    var currentID = parseJwt($.cookie("token")).sub;
    var currentUsername;
    var currentPrivilege;
    var initialMD5 = null;
    var scrollHeight = null;
    var accounts_inputs;

    var usernameStorage;

    var showNewAccount = function(accountID, accountUsername, enabled) {
        var disableButtonText;
        if (enabled) {
            disableButtonText = "Disable";
        } else {
            disableButtonText = "Enable";
        }

        accounts_inputs.append("<div class=\"mdc-text-field\"> <input class=\"account_usernames mdc-text-field__input\" type=\"text\" name=\"" + accountID + "\" value=\"" + accountUsername + "\"> <div class=\"mdc-line-ripple\"></div> <label class=\"mdc-floating-label\">New username</label> </div> " +
            "<div class=\"mdc-text-field\"> <input class=\"account_passwords mdc-text-field__input\" type=\"password\" name=\"" + accountID + "\"> <div class=\"mdc-line-ripple\"></div> <label class=\"mdc-floating-label\">New password</label> </div> " +
            "<button class=\"account_disable mdc-button\" name=\"" + accountID + "\">" + disableButtonText + "</button> " +
            "<button class=\"account_delete mdc-button\" name=\"" + accountID + "\">Delete</button>" +
            "<br><br>")
    };

    var getAccounts = function() {
        $("#accounts_inputs").remove();
        accounts.append("<div id=\"accounts_inputs\"></div>");
        accounts_inputs = $("#accounts_inputs");

        usernameStorage = {};

        getRequest("/accounts/list", function(xmlHttpRequest) {
            if (xmlHttpRequest.status == 200) {
                if (xmlHttpRequest.responseURL.search("login") != -1) {
                    window.location = "/logout";
                }

                var accountsList = xmlHttpRequest.responseText.trim().split("\n");

                for (var line in accountsList) {
                    var account = accountsList[line].split(",");

                    if (account[0] == currentID) {
                        currentUsername = account[1];
                        currentPrivilege = account[3];
                        $("#username").text(currentUsername);

                        showNewAccount(currentID, currentUsername, true);
                        $(".account_disable[name=" + currentID + "]").hide();
                        break;
                    }
                }

                for (var line in accountsList) {
                    var account = accountsList[line].split(",");

                    if (account[0] != currentID) {
                        var accountID = account[0];
                        var accountUsername = account[1];
                        var accountEnabled = account[2] == "1";
                        var accountPrivilege = account[3];

                        if ((accountPrivilege < currentPrivilege && accountUsername != "admin") || currentUsername == "admin") {
                            showNewAccount(accountID, accountUsername, accountEnabled);
                        }
                    }

                    if (account[1] == "admin") {
                        $(".account_usernames[name=" + account[0] + "]").prop("disabled", true);
                        $(".account_disable[name=" + account[0] + "]").prop("disabled", true);
                        $(".account_delete[name=" + account[0] + "]").prop("disabled", true);
                    }

                    usernameStorage[account[0]] = account[1];
                }

                if (currentPrivilege > 0 || currentUsername == "admin") {
                    accounts_inputs.append("<div class=\"mdc-text-field\"> <input class=\"mdc-text-field__input\" id=\"new_account_username\" type=\"text\"> <div class=\"mdc-line-ripple\"></div> <label class=\"mdc-floating-label\">New account username</label> </div> " +
                        "<div class=\"mdc-text-field\"> <input class=\"mdc-text-field__input\" id=\"new_account_password\" type=\"password\"> <div class=\"mdc-line-ripple\"></div> <label class=\"mdc-floating-label\">New account password</label> </div> " +
                        "<button class=\"mdc-button\" id=\"new_account_submit\">Create</button>" +
                        "<br><br>")

                }

                var x = document.getElementsByClassName('mdc-text-field');
                for (var i = 0; i < x.length; i++) {
                    new mdc.textField.MDCTextField(x[i]);
                }

                x = document.getElementsByClassName('mdc-button');
                for (var i = 0; i < x.length; i++) {
                    mdc.ripple.MDCRipple.attachTo(x[i]);
                }

                $("#new_account_submit").click(function() {
                    if (!newAccount()) {
                        showSnackbar(basicSnackbar, "Username and password cannot be empty");
                    }
                });

                $(".account_disable").click(disableAccount);

                $(".account_delete").click(deleteAccount);

                if (scrollHeight != null) accounts.scrollTop(accounts[0].scrollHeight - scrollHeight);
            }
        });
    };

    var updateAccount = function(data, url, selector) {
        postRequest("/accounts/" + url, data, function(xmlHttpRequest) {
            getInitialHash();
            showSnackbar(basicSnackbar, xmlHttpRequest.responseText);
            if (xmlHttpRequest.status == 200) {
                if (url == "enable") selector.html("Disable");
                if (url == "disable") selector.html("Enable");
                $("#username").text(currentUsername);
            }
            if (xmlHttpRequest.status != 200 || (xmlHttpRequest.status == 200 && (url == "delete" || url == "new"))) {
                scrollHeight = accounts[0].scrollHeight - accounts.scrollTop();
                getAccounts();
            }
        });
    };

    var getInitialHash = function() {
        getRequest("/accounts/hash", function(xmlHttpRequest) {
            if (xmlHttpRequest.status == 200) {
                initialMD5 = xmlHttpRequest.responseText;
            }
        });
    };

    getAccounts();
    getInitialHash();

    var submit = function() {
        var postDictionary = {};

        var passwordInputs = $(".account_passwords");
        passwordInputs.each(function(index) {
            var id = $(this)[0].name;
            var newPassword = $(this).val();

            postDictionary[id] = {};
            if (newPassword.trim() != "") {
                postDictionary[id]["new_password"] = newPassword;
            }
            $(this).val("");
        });

        var usernameInputs = $(".account_usernames");
        usernameInputs.each(function(index) {
            var id = $(this)[0].name;
            var newUsername = $(this).val().trim();

            if (usernameStorage[id] != newUsername && newUsername != "") {
                usernameStorage[id] = newUsername;
                if (id == currentID) currentUsername = newUsername;
                postDictionary[id]["new_username"] = newUsername;
			}
			if (newUsername == "") {
				$(this).val(usernameStorage[id]);
			} else {
				$(this).val(newUsername);
			}
        });

        var noChange = true;
        for (var id in postDictionary) {
            if (postDictionary.hasOwnProperty(id)) {
                var data = postDictionary[id];
                if (Object.keys(data).length == 0) {
                    continue;
                }
                noChange = false;
                var postBody = "id=" + encodeURIComponent(id) + "&";
                if (data.hasOwnProperty("new_username")) {
                    var newUsername = data["new_username"];
                    postBody += "new_username=" + encodeURIComponent(newUsername) + "&";
                }
                if (data.hasOwnProperty("new_password")) {
                    var newPassword = data["new_password"];
                    postBody += "new_password=" + encodeURIComponent(newPassword) + "&";
                }
                postBody = postBody.substring(0, postBody.length - 1);
                updateAccount(postBody, "update");
            }
        }

        if (newAccount()) noChange = false;

        if (noChange) {
            showSnackbar(basicSnackbar, "No changes were made");
        }
    };

    var submitCheck = function() {
        getRequest("/accounts/hash", function (xmlHttpRequest) {
            if (xmlHttpRequest.status == 200) {
                if (xmlHttpRequest.responseURL.search("login") != -1) {
                    window.location = "/logout";
                }
                var md5 = xmlHttpRequest.responseText;
                if (initialMD5 == md5) {
                    submit();
                } else {
                    showDialog(yesNoDialog, "Game Server Control Panel", "Changes have been made since you entered this site.\nDo you want to override those changes?", {"yes": function() {submit();}});
                }
            }
        });
    };

    $(document).keypress(function(e) {
        var key = e.which;
        if (key == 13) {
            submitCheck();
        }
    });

    var newAccount = function() {
		if (currentPrivilege > 0 || currentUsername == "admin") {

			var usernameInput = $("#new_account_username");
			var passwordInput = $("#new_account_password");

			var username = usernameInput.val();
			var password = passwordInput.val();

			if (username.trim() != "" && password.trim() != "") {
				var data = "username=" + encodeURIComponent(username.trim()) + "&password=" + encodeURIComponent(password);
				updateAccount(data, "new");
				return true;
			}
		}
        return false;
    };

    var disableAccount = function() {
        var id = $(this)[0].name;
        var data = "id=" + encodeURIComponent(id);

        if ($(this).html() == "Disable") {
            updateAccount(data, "disable", $(this));
        } else {
            updateAccount(data, "enable", $(this));
        }
    };

    var deleteAccount = function() {
        var id = $(this)[0].name;
        var data = "id=" + encodeURIComponent(id);

        var prompt = "Are you sure you want to delete " + usernameStorage[id] + "?";
        if (currentID == id) {
            prompt = "Are you sure you want to delete your account?";
        }

        showDialog(yesNoDialog, "Game Server Control Panel", prompt, {"yes": function() {updateAccount(data, "delete");}});
    };

    $("#submit").click(submitCheck);

});
