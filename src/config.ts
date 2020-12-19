// Site-dependent configuration
const config = {
    campaignServerUrl: window.location.protocol + "//" + window.location.hostname + ":" + window.location.port,
    tilesUrlTemplate:
        function (map: string) {
            var mapName = "stalingrad";
            switch(map) {
                case "rheinland-summer":
                case "rheinland-winter":
                case "rheinland-autumn":
                case "rheinland-spring":
                    mapName = "rheinland";
                case "stalingrad-summer-1942":
                case "stalingrad-autumn-1942":
                case "stalingrad-winter-1942":
                    mapName = "stalingrad";
                default:
                    mapName = map.split("-")[0];
            }        
            return `https://tiles.il2missionplanner.com/${mapName}/{z}/{x}/{y}.png`;
        },
    iconUrl: "https://il2missionplanner.com/img/"
}
