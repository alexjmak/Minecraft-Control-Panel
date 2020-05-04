$(document).ready(function() {
    let files = $("#files");

    folderContents = folderContents.filter(function(file) {
        return !file.name.startsWith(".");
    });

    let filesPath = location.pathname.substring(1);
    filesPath = decodeURIComponent(filesPath);
    let filesPathSplit = filesPath.split("/");
    let currentPath = "/" + filesPathSplit[0];
    filesPathSplit.shift();
    let folderName;

    if (filesPathSplit.length === 0) {
        folderName = "Minecraft";
    }
    else folderName = filesPathSplit[filesPathSplit.length - 1];
    $(".mdc-drawer__title").text(folderName);

    let selectedItem;

    if (filesPathSplit.length === 0) {
        $("#back").hide();
    }


    if (filesPathSplit.length > 3) {
        $("#navigation-bar").append("<td><div style='margin-top: 10px' class=\"navigation-arrow material-icons\">chevron_right</div></td>");
        $("#navigation-bar").append("<td><button class='mdc-menu-surface--anchor' id='path-overflow-button' style='font-size: 15px; margin-top: 7px; margin-left: 5px; border: none; outline: none; background-color: transparent'><h4>...</h4><div id='path-overflow-menu' class=\"mdc-menu mdc-menu-surface\"> <ul id='path-overflow-list' class=\"mdc-list\" role=\"menu\" aria-hidden=\"true\" aria-orientation=\"vertical\" tabindex=\"-1\"> </ul> </div></button></td>");
        const pathOverflowMenu = new mdc.menu.MDCMenu(document.querySelector('#path-overflow-menu'));
        let currentPathOriginal = currentPath;
        pathOverflowMenu.listen("MDCMenu:selected", function() {
            let currentPathCopy = currentPathOriginal;
            for (let i = 0; i <= event.detail.index; i++) {
                currentPathCopy += "/" + filesPathSplit[i];

            }

            window.location.href = currentPathCopy;
        });

        $("#path-overflow-button").click(function() {
            pathOverflowMenu.open = true;
        });
    }

    for (let directoryIndex in filesPathSplit) {
        let directory = filesPathSplit[directoryIndex];
        currentPath += "/" + directory;
        if (directory.trim() === "") continue;
        if (filesPathSplit.length > 3 && directoryIndex < filesPathSplit.length - 2) {
            $("#path-overflow-list").append("<li class=\"mdc-list-item\" role=\"menuitem\"> <span class=\"mdc-list-item__text\">" + directory + "</span> </li>");
            continue;
        }
        $("#navigation-bar").append("<td><div style='margin-top: 10px' class=\"navigation-arrow material-icons\">chevron_right</div></td>");
        $("#navigation-bar").append(`<td><button onclick=\"window.location.href = '${currentPath.replace("'", "%27").replace("\"", "%22")}';" style='font-size: 16px; margin-top: 7px; margin-left: 5px; border: none; outline: none; background-color: transparent'><h4>${directory}</h4></button></td>`);
    }

    $("#navigation-bar").append("<td hidden id='actionButtons' style='position: absolute; right: 7px;'><button id='download' class=\"mdc-icon-button material-icons\">cloud_download</button><button id='delete' class=\"mdc-icon-button material-icons\">delete</button></td>");

    let iconButtons = document.getElementsByClassName('mdc-icon-button');
    for (let i = 0; i < iconButtons.length; i++) {
        new mdc.ripple.MDCRipple(iconButtons[i]).unbounded = true;
    }

    let fileNames = {};


    for (let fileIndex in folderContents) {
        if (folderContents.hasOwnProperty(fileIndex)) {
            let file = folderContents[fileIndex];
            if (file.name === "..") {
                let backButton = $("#back");
                backButton.click(function() {
                    window.open(location.pathname + "/..", "_self");
                });
                backButton.prop("hidden", false);
                continue;
            }

            file.size = file.size.replace(".00", "");
            file.date = file.date.split(".");
            let month = file.date[0];
            file.date[0] = file.date[1];
            file.date[1] = month;
            file.date = file.date.join("/");
            let icon = "subject";
            if (file.type === "directory") {
                file.size = "----";
                icon = "folder";
            }

            fileNames[fileIndex.toString()] = file.name;
            files.append(`<tr class='underlinedTR file' name='${fileIndex}'><td><span class='file-icons material-icons'>${icon}</span></td><td><p>${file.name}</p></td><td><p>${file.size.toUpperCase()}</p></td><td><p>${file.date}</p></td></tr>`);

        }
    }

    $(".file").click(function() {
        fileClick(this);
    });

    $(".file").dblclick(function() {
        fileDblClick(this)
    });

    $(document).keydown(function(e) {
        switch (e.keyCode) {
            case 38:
                $(".file").css("background-color", "");
                if (selectedItem === undefined) {
                    $(".file").eq(0).css("background-color", "#e6e6e6");
                    selectedItem = $(".file").get(0);
                    $("#actionButtons").show()
                } else {
                    let fileId = parseInt($(selectedItem).attr("name"));
                    $(".file").eq((fileId - 1) % $(".file").length).css("background-color", "#e6e6e6");
                    selectedItem = $(".file").get((fileId - 1) % $(".file").length);

                }
                break;

            case 40:
                $(".file").css("background-color", "");
                if (selectedItem === undefined) {
                    $(".file").eq(0).css("background-color", "#e6e6e6");
                    selectedItem = $(".file").get(0);
                    $("#actionButtons").show()
                } else {
                    let fileId = parseInt($(selectedItem).attr("name"));
                    $(".file").eq((fileId + 1) % $(".file").length).css("background-color", "#e6e6e6");
                    selectedItem = $(".file").get((fileId + 1) % $(".file").length);
                }
                break;
        }
    });

    $(document).keypress(function(e) {
        switch (e.which) {
            case 13:
                let fileId = $(selectedItem).attr("name");
                let fileName = fileNames[fileId];
                window.location = [location.pathname, fileName].join("/");
                break;
        }
    });

    $(document).click(function (e) {

        if (!$(".file").is(e.target) && $(".file").has(e.target).length === 0) {

            setTimeout(function() {
                selectedItem = undefined;
                $(".file").css("background-color", "");
                $("#actionButtons").hide()
            }, 0);
        }
    });


    $("#download").click(function () {
        let fileId = $(selectedItem).attr("name");
        let fileName = fileNames[fileId];
        window.open([location.pathname, fileName].join("/") + "?download", "_blank");
    });

    $("#download-current-dir").click(function () {
        window.open(location.pathname + "?download", "_blank");
    });

    $("#delete").click(function () {
        let fileId = $(selectedItem).attr("name");
        let fileName = fileNames[fileId];
        showDialog(yesNoDialog, "MakCloud", "Are you sure you want to delete " + fileName  + "?", {"yes": function() {
                deleteRequest([location.pathname, fileName].join("/"), null, function(xmlHttpRequest) {
                    if (xmlHttpRequest.status === 200)  {
                        folderContents.splice(fileId, 1);
                        reload();
                        showSnackbar(basicSnackbar, "Deleted " + fileName)
                    } else {
                        showSnackbar(basicSnackbar, "Error deleting " + fileName)
                    }
                });
            }});
    });


    $("html").on("dragover", function(e) {
        e.preventDefault();
        e.stopPropagation();
    });

    $("html").on("drop", function(e) { e.preventDefault(); e.stopPropagation(); });

    // Drag enter
    $("#files").on('dragenter', function (e) {
        console.log("dragenter");
    });

    // Drag over
    $("#files").on('dragover', function (e) {
        console.log("dragover");
    });

    // Drop
    $("#files").on('drop', function (e) {
        console.log("drop");
    });

    function fileClick(file) {
        $(".file").css("background-color", "");
        $(file).css("background-color", "#e6e6e6");
        $("#actionButtons").show();
        selectedItem = file;
    }

    function fileDblClick(file) {
        let fileId = $(selectedItem).attr("name");
        let fileName = fileNames[fileId];
        window.location = [location.pathname, fileName].join("/");
    }

    function reload() {
        $(".file").remove();
        fileNames = {};
        for (let fileIndex in folderContents) {
            if (folderContents.hasOwnProperty(fileIndex)) {
                let file = folderContents[fileIndex];

                let icon = "subject";
                if (file.type === "directory") {
                    file.size = "----";
                    icon = "folder";
                }

                fileNames[fileIndex.toString()] = file.name;
                files.append(`<tr class='underlinedTR file' name='${fileIndex}'><td><span class='file-icons material-icons'>${icon}</span></td><td><p>${file.name}</p></td><td><p>${file.size.toUpperCase()}</p></td><td><p>${file.date}</p></td></tr>`);

            }
        }

        $(".file").click(function() {
            fileClick(this);
        });
        $(".file").dblclick(function() {
            fileDblClick(this)
        });
    }

});




function deselectAll() {

}