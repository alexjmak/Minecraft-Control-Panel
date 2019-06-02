console.log(user);
$(document).ready(function() {
    var x = document.getElementsByClassName('mdc-button');
    var i;
    for (i = 0; i < x.length; i++) {
        mdc.ripple.MDCRipple.attachTo(x[i]);
    }

	var title = $("#title");
    var command = $("#command");
    var consoleDiv = $("#console");
    var log = $("#console_text");
    var oldLogText = true;
    var oldMD5 = null;
    var scrollDifference = consoleDiv[0].scrollHeight - consoleDiv.scrollTop();
    var noConnDialog;

    $("#computername").text(parseJwt($.cookie("token")).iss);
	var getProperties = function() {
	    getRequest("/Minecrserver.properties", function(xmlHttpRequest) {
            if (xmlHttpRequest.status == 200) {
                var propertiesDictionary = {};
                var propertiesList = xmlHttpRequest.responseText.trim().split("\n");
                for (var line in propertiesList) {
                    var property = propertiesList[line];

                    if (!property.startsWith("#")) {
                        var lineSplit = property.split("=");
                        propertiesDictionary[lineSplit[0]] = lineSplit[1];
                    }
                }
                title.text(propertiesDictionary["motd"]);
            }
        });
    };
	
    var getLogHash = function(automatic) {
        getRequest("/log/hash", function(xmlHttpRequest) {
            if (xmlHttpRequest.status == 200) {
                if (noConnDialog != undefined && noConnDialog.isOpen) noConnDialog.close();
                var md5 = xmlHttpRequest.responseText;
                if (xmlHttpRequest.responseURL.search("login") != -1) {
                    showDialog(okDialog, "Game Server Control Panel", "Your session has expired", {"close": function() {window.location = "/logout"}});
                } else if (oldMD5 != md5) {
                    oldMD5 = md5;
                    getLog();
                }
            }
            if (xmlHttpRequest.status == 0) {
                noConnDialog = showDialog(okDialog, "Game Server Control Panel", "No connection");
                noConnDialog.buttons_[0].firstChild.innerHTML = "RETRY";
                noConnDialog.escapeKeyAction = "";
                noConnDialog.scrimClickAction = "";
            }
            if (automatic) {
                window.setTimeout(getLogHash, 5000, true);
            }
        });
    };

    var getLog = function() {
        getRequest("/log", function(xmlHttpRequest) {
            if (xmlHttpRequest.status == 200) {
                var logText = xmlHttpRequest.responseText;
                logText = logText.replace(/\n/g, "<br>");
                log.text("");
                log.append(logText);
                if (oldLogText != logText) {
                    oldLogText = logText;
                    var logLines = logText.split(/\r*<br>/).length;
                    if ((consoleDiv[0].scrollHeight - consoleDiv.scrollTop()) < scrollDifference + 130) {
                        consoleDiv.scrollTop(consoleDiv[0].scrollHeight);
                    } else {
                        consoleDiv.scrollTop(consoleDiv.animate({
                            scrollTop: consoleDiv[0].scrollHeight}, 'slow'));
                    }
                }
            }
        });
    };

    var postCommand = function(command) {
        var data = "command=" + encodeURIComponent(command);
        postRequest("/command", data, function(xmlHttpRequest) {
            if (xmlHttpRequest.status == 200) {
                getLogHash(false);
            }
            if (xmlHttpRequest.status == 401) {
                showDialog(okDialog, "Game Server Control Panel", xmlHttpRequest.responseText);
            }
        });
    };

    var submit = function() {
        command.focus();
        if (command.val().trim() != "") {
            postCommand(command.val());
            command.val("");
        }
    };

    command.focus();

    $(document).keypress(function(e) {
        var key = e.which;
        if (key == 13) {
            submit();
        }
    });

    $("#start").click(function() {
        postCommand("start")
    });

    $("#stop").click(function() {
        postCommand("stop")
    });

    getProperties();
    getLogHash(true);
});