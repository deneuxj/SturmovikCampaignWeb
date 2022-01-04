// Site-dependent configuration
const config = {
    campaignServerUrl: window.location.protocol + "//" + window.location.hostname + ":" + window.location.port,
    banEnforcerUrl: window.location.protocol + "//" + window.location.hostname + ":" + 8081,
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
            return `${window.location.protocol}//${window.location.hostname}:${window.location.port}/img/dist/${mapName}/{z}/{x}/{y}.png`;
        },
    iconUrl: `${window.location.protocol}//${window.location.hostname}:${window.location.port}/img/`
}
