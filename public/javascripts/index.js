$(document).ready(function() {
    var x = document.getElementsByClassName('mdc-button');
    var i;
    for (i = 0; i < x.length; i++) {
        mdc.ripple.MDCRipple.attachTo(x[i]);
    }

	var title = $("#title");
    var command = $("#command");
    var console = $("#console");
    var log = $("#console_text");
    var oldLogText = true;
    let oldSize = 0;
    var scrollDifference = console[0].scrollHeight - console.scrollTop();
    var noConnDialog;
    var restartClicked = false;
    var firstRun = true;


    const memoryBar = mdc.linearProgress.MDCLinearProgress.attachTo(document.getElementById('memoryBar'));

    let status = {};

    function updateWindow() {
        if ($(window).width() < 580) {
            $("#memory").hide();
            $("#memoryTitle").hide();

            $("#memoryBar").css("padding-top", "15px")
        } else {
            $("#memory").show();
            $("#memoryTitle").show();
            $("#memoryBar").css("padding-top", "0")
        }
    }

    $(window).resize(function() {
        updateWindow();
    });
    var updateGameServerStatus = function() {
        if (firstRun) {
            firstRun = false;
            $("#start").attr("disabled", false);
            $("#stop").attr("disabled", false);
            $("#restart").attr("disabled", false);
        }
        if (status.online) {
            if (restartClicked) {
                $("#stop").attr("disabled", false);
                $("#restart").attr("disabled", false);
                restartClicked = false;
            }

            $("#start").attr("disabled", false);
            $("#online").text("ONLINE");
            $("#online").css("color", "green");
            $("#playerCount").text("v" + status.version + " (" + status.current_players + "/" + status.max_players + ")");
            $("#start").hide();
            $("#stop").show();
            $("#restart").show();
            $("#memory").text((status.memory/1000000000).toFixed(2) + "/" + (status.allocatedMemory/1000000000).toFixed(2) + " GB" + " (" + (status.memory/status.allocatedMemory * 100).toFixed(2) + "%)")
            memoryBar.progress = status.memory/status.allocatedMemory;
            $("#processUsage").show();

        } else {
            $("#online").text("OFFLINE");
            $("#online").css("color", "red");
            $("#playerCount").text("");
            if (!restartClicked) {
                $("#stop").attr("disabled", false);
                $("#restart").attr("disabled", false);
                $("#start").show();
                $("#stop").hide();
                $("#restart").hide();
            }
            $("#processUsage").hide();
        }
    };


    var getGameServerStatus = function(automatic) {
        getRequest("/status", function(xmlHttpRequest) {
            let timeout = 10000;
            if (xmlHttpRequest.status === 200) {
                if (xmlHttpRequest.responseURL.search("login") !== -1) {
                    automatic = false;
                    return;
                }
                status = JSON.parse(xmlHttpRequest.responseText);
            }
            if (xmlHttpRequest.status !== 200) status = {online: null};

            if (status.online === null) timeout = 5000;

            status.online = status.online === true;
            updateGameServerStatus();

            if (automatic) {
                window.setTimeout(getGameServerStatus, timeout, true);
            }
        });

    };

	var getProperties = function() {
	    getRequest("/files/server.properties?download", function(xmlHttpRequest) {
            if (xmlHttpRequest.status === 200) {
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

        getRequest("/log/size", function(xmlHttpRequest) {
            if (xmlHttpRequest.status == 200) {
                if (noConnDialog != undefined && noConnDialog.isOpen) noConnDialog.close();
                let size = parseInt(xmlHttpRequest.responseText);
                if (xmlHttpRequest.responseURL.search("login") !== -1) {
                    automatic = false;
                    showDialog(okDialog, "Minecraft Control Panel", "Your session has expired", {"close": function() {window.location = "/logout"}});
                } else if (oldSize !== size) {
                    if (size > oldSize) getLog(oldSize);
                    else getLog();
                    oldSize = size;
                }
            }
            if (xmlHttpRequest.status == 0 && (noConnDialog === undefined || !noConnDialog.isOpen)) {
                try {
                    noConnDialog = showDialog(okDialog, "Minecraft Control Panel", "No connection", {
                        "close": function() {
                            getLogHash(false);
                        }
                    });
                    noConnDialog.buttons_[0].firstChild.innerHTML = "RETRY";
                    noConnDialog.escapeKeyAction = "";
                    noConnDialog.scrimClickAction = "";
                } catch (err) {
                }

            }
            if (automatic) {
                window.setTimeout(getLogHash, 5000, true);
            }
        });
    };

    let getLog = function(start) {
        if (!start) {
            start = 0;
            log.text("");
        }

        getRequest("/log?start=" + start, function(xmlHttpRequest) {
            if (xmlHttpRequest.status === 200) {
                let logText = xmlHttpRequest.responseText;
                log.append(logText);
                if (oldLogText !== logText) {
                    oldLogText = logText;
                    if ((console[0].scrollHeight - console.scrollTop()) < scrollDifference + 130) {
                        console.scrollTop(console[0].scrollHeight);
                    } else {
                        console.scrollTop(console.animate({
                            scrollTop: console[0].scrollHeight}, 'slow'));
                    }
                }
            }
        });
    };

    var postCommand = function(command) {
        if (command === "start") {
            $("#start").attr("disabled", true);
        } else if (command === "stop" || command ===  "restart") {
            if (command === "restart") restartClicked = true;
            $("#stop").attr("disabled", true);
            $("#restart").attr("disabled", true);
        }
        var data = "command=" + encodeURIComponent(command);
        postRequest("/command", data, function(xmlHttpRequest) {
            if (xmlHttpRequest.status == 200) {
                getLogHash(false);
            }
            if (xmlHttpRequest.status == 401) {
                restartClicked = false;
                $("#start").attr("disabled", false);
                $("#stop").attr("disabled", false);
                $("#restart").attr("disabled", false);

                showDialog(okDialog, "Minecraft Control Panel", xmlHttpRequest.responseText);
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
        if (key === 13) {
            submit();
        }
    });

    $("#start").click(function() {
        postCommand("start");

    });

    $("#stop").click(function() {
        postCommand("stop");
    });

    $("#restart").click(function() {
        postCommand("restart");
    });

    updateWindow();
    getProperties();
    getLogHash(true);
    getGameServerStatus(true);
});