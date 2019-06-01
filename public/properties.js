$(document).ready(function() {

    var properties = $("#properties");
    var initialPropertiesDictionary = {};
    var propertiesDictionary = {};
    var initialMD5 = null;

    var getProperties = function() {
        getRequest("/Minecraft/server.properties", function(xmlHttpRequest) {
            if (xmlHttpRequest.status == 200) {
                var propertiesList = xmlHttpRequest.responseText.trim().split("\n");
                for (var line in propertiesList) {
                    var property = propertiesList[line];

                    if (!property.startsWith("#")) {
                        var lineSplit = property.split("=");
                        initialPropertiesDictionary[lineSplit[0]] = lineSplit[1];
                    }
                }

                for(var property in initialPropertiesDictionary) {
                    if (initialPropertiesDictionary.hasOwnProperty(property)) {
                        var value = initialPropertiesDictionary[property];
                        properties.append("<p class=\"property\">" + property + " <input class=\"property_input\" type=\"text\" value=\"" + value + "\"></p><br>");
                    }
                }

                var propertyhtml = properties.html();
                properties.html(propertyhtml.substring(propertyhtml.length - 4, propertyhtml - 1));
            }
        });
    };

    var getInitialHash = function() {
        getRequest("/properties/hash", function(xmlHttpRequest) {
            if (xmlHttpRequest.status == 200) {
                initialMD5 = xmlHttpRequest.responseText;
            }
        });
    };

    getProperties();
    getInitialHash();

    var submit = function() {
        for (var propertyIndex in $(".property")) {
            var property = $(".property")[propertyIndex];

            var property_input = property.lastChild;

            try {
                var property_text = property.firstChild.textContent;
            } catch (TypeError) {
                continue;
            }
            property_text = property_text.substring(0, property_text.length - 1);

            try {
                var property_input_text = property_input.value.trim();
            } catch (TypeError) {
                property_input_text = "";
            }

            if (initialPropertiesDictionary.hasOwnProperty(property_text)) {
                var initialProperty_input_text = initialPropertiesDictionary[property_text];
                if (initialProperty_input_text != property_input_text) {
                    propertiesDictionary[property_text] = property_input_text;
                    initialPropertiesDictionary[property_text] = property_input_text;
                }
            } else {
                propertiesDictionary[property_text] = property_input_text;
                initialPropertiesDictionary[property_text] = property_input_text;
            }
        }

        if (Object.keys(propertiesDictionary).length == 0) {
            alert("No changes were made");
        } else {
            var post = "";
            for (var property in propertiesDictionary) {
                if (propertiesDictionary.hasOwnProperty(property)) {
                    var value = propertiesDictionary[property];
                    post += property + "=" + encodeURIComponent(value) + "&";
                }
            }
            post = post.substring(0, post.length - 1);

            postRequest("/properties", post, function(xmlHttpRequest) {
                alert(xmlHttpRequest.responseText);
                getInitialHash();
            });
        }
    };

    var submitCheck = function() {
        getRequest("/properties/hash", function(xmlHttpRequest) {
            if (xmlHttpRequest.status == 200) {
                var md5 = xmlHttpRequest.responseText;
                if (xmlHttpRequest.responseURL.search("login") != -1) {
                    alert("You have been logged out");
                    window.location = "/logout";
                    return;
                }
                if (initialMD5 == md5) {
                    submit();
                } else {
                    if (confirm("Changes have been made since you entered this site.\nDo you want to override those changes?")) {
                        submit()
                    }
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

    $("#submit").click(submitCheck)
});