/// <reference path="./config.ts"/>
/// <reference path="./types.ts"/>
/// <reference path="./dataSource.ts"/>
/// <reference path="./sampleData.ts"/>

//const dataSource = new SampleDataSource()
const dataSource = new WebDataSource(config.campaignServerUrl)