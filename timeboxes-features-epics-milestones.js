var q = require('q');
var _ = require('lodash');

var rally = null;
var workspaceRef = '/workspace/33663719110'; //N Data
var userOids = ['35492101293','35492816963','35493297168']; //kepler,tyhobrahe,klampakis
var millisecondsInDay = 86400000;


createRally();

getProjects()
    .then(function(result){
        var timeboxes = [];
        timeboxes.push(makeReleases(result));
        timeboxes.push(makeIterations(result));
        return q.all(timeboxes);
    })
    .then(function(result){
        var featuresAndMilestones = [];
        featuresAndMilestones.push(makeMilestones(result));
        featuresAndMilestones.push(makeFeatures(result));
        return q.all(featuresAndMilestones);
    })
    .then(makeEpicStories)
    .then(onSuccess)
    .fail(onError);


function createRally(){
    rally = require('rally'),
    queryUtils = rally.util.query,
    rallyApi = rally({
        apiKey: '_abc123',
        server: 'https://rally1.rallydev.com',  
        requestOptions: {
            headers: {
                'X-RallyIntegrationName': 'Nick\'s node.js program',  
                'X-RallyIntegrationVendor': 'Rally Labs',             
                'X-RallyIntegrationVersion': '1.0'                    
            }
        }
    });
}


function getProjects() {
    return rallyApi.query({
        ref: workspaceRef + '/projects',
        limit: Infinity,
        fetch: ['Name','ObjectID','State','Children','Parent'],
        query: (queryUtils.where('State', '=', 'Open')).and('Parent', '!=', null),
        requestOptions: {}
    });
}


function makeReleases(result) {
    var releases = [];
    var numOfReleasesEachProject = 2;
    var releaseLength = 30;
    var today = new Date();
        for(var n=0; n<numOfReleasesEachProject; n++){
            var releaseStartDate = new Date(today.getTime() + millisecondsInDay*n*(releaseLength));
            var releaseDate = new Date(releaseStartDate.getTime() + millisecondsInDay*releaseLength);
            var releaseName = 'Release ' + n;
            var data ={
                Name: releaseName,
                ReleaseStartDate: releaseStartDate.toISOString(),
                ReleaseDate: releaseDate.toISOString(),
                State: 'Planning'
            };
            for(var i=0; i<result.Results.length; i++){
                if (result.Results[i].Children.Count > 0) {
                    data.Notes = "CreateFeaturesMilestones:Yes";
                }
                else{
                    data.Notes = "";
                }
                console.log('CREATING RELEASE in ' + result.Results[i]._refObjectName);
                releases.push(rallyApi.create({
                    type: 'release',
                    data: data,
                    fetch: ['ObjectID','Project','ReleaseStartDate','Notes','ReleaseDate','PlannedVelocity','ChildrenPlannedVelocity'],  
                    scope: {
                        project: result.Results[i]
                    },
                }));
            }
        }
    return q.all(releases);
}

function makeIterations(result) {
    var iterations = [];
    var numOfIterationsEachProject = 4;
    var iterationLength = 15;
    var today = new Date();
        for(var n=0; n<numOfIterationsEachProject; n++){
            var iterationStartDate = new Date(today.getTime() + millisecondsInDay*n*(iterationLength));
            var iterationEndDate = new Date(iterationStartDate.getTime() + millisecondsInDay*iterationLength);
            var iterationName = 'Iteration ' + n;
            for(var i=0; i<result.Results.length; i++){
                console.log('CREATING  ITERATION in ' + result.Results[i]._refObjectName);
                iterations.push(rallyApi.create({
                    type: 'iteration',
                    data: {
                        Name: iterationName,
                        StartDate: iterationStartDate.toISOString(),
                        EndDate: iterationEndDate.toISOString(),
                        State: 'Planning'
                    },
                    fetch: ['ObjectID','Project','StartDate','EndDate'],  
                    scope: {
                        project: result.Results[i]
                    },
                }));
            }
        }
    return q.all(iterations);
}

function makeMilestones(result){
    var milestones = [];
    var releases = result[0];
    var randomDaysBeforeRelease = randomInt(1, 7);
    for (var i = 0; i < releases.length; i++) {
        if (releases[i].Object.Notes === "CreateFeaturesMilestones:Yes") {
            var milestoneDate = new Date((new Date(releases[i].Object.ReleaseDate.substring(0,10)))
                                         - millisecondsInDay*randomDaysBeforeRelease);
            var targetProjectRef = releases[i].Object.Project._ref;
            var targetProjectName = releases[i].Object.Project._refObjectName;
            var milestoneName = 'Day ' + i +' on ' + targetProjectName;
            console.log('CREATING MILESTONE within ' + releases[i].Object.Project._refObjectName);
            milestones.push(rallyApi.create({
                    type: 'milestone',
                    data: {
                        Name: milestoneName,
                        TargetDate: milestoneDate,
                        TargetProject: targetProjectRef
                    },
                    fetch: ['ObjectID','FormattedID','TargetProject','TargetDate','Artifacts'],  
                    scope: {
                        project: releases[i].Object.Project
                    }
                }));
        }
    }
    return q.all(milestones);
}

function makeFeatures(result){
    console.log('CREATING FEATURES...');
    var features = [];
    var releases = result[0];
    var missionTypes = ['Flyby','Orbiter','Lander','Rover'];
    for (var i = 0; i < releases.length; i++) {
        if (releases[i].Object.Notes === "CreateFeaturesMilestones:Yes") {
            var targetProjectRef = releases[i].Object.Project._ref;
            var targetProjectName = releases[i].Object.Project._refObjectName;
            var featureRelease = releases[i].Object._ref;
            var featurePlannedStartDate = releases[i].Object.ReleaseStartDate;
            var featurePlannedEndDate = releases[i].Object.ReleaseDate;
            console.log('CREATING FEATURE in ' + releases[i].Object.Project._refObjectName + ', release ' + releases[i].Object._refObjectName);
            for(var j = 0; j<missionTypes.length; j++){
                features.push(rallyApi.create({
                    type: 'portfolioitem/feature',
                    data: {
                        Name: targetProjectName  + ' ' + missionTypes[j] + ' feature ' + i,
                        Release: featureRelease,
                        PlannedStartDate: featurePlannedStartDate,
                        PlannedEndDate: featurePlannedEndDate,
                        Owner: setOwner()
                    },
                    fetch: ['ObjectID','FormattedID','Project'],  
                    scope: {
                        project: releases[i].Object.Project._ref
                    }
                }));
            }
        }
    }
    return q.all(features);
}

function makeEpicStories(result){
    var milestones = result[0];
    var features = result[1];
    var epics = [];
    var data = [];
    var numOfStoriesPerFeature = randomInt(2, 4);
    for (var i = 0; i < milestones.length; i++) {
        (function( lockedIndex ){
            makeFeatureForMilestone(milestones[i].Object)
                .then(function(result){
                    var refOfFeature = result.Object._ref;
                    var refOfMilestone = milestones[lockedIndex].Object._ref; 
                    rallyApi.add({
                        ref: refOfMilestone,  
                        collection: 'Artifacts', 
                        data: [{
                            _ref: refOfFeature
                        }],
                        fetch: ['FormattedID', 'Name', 'Milestones', 'PlannedStartDate','PlannedEndDate','UserStories'],
                        requestOptions: {} 
                    });    
                });
        }(i));
    }
    
    for (var i = 0; i < features.length; i++) {
        for(var n=0; n<numOfStoriesPerFeature;n++){
            data.push({
               Name: 'Epic ' + n + ':' + i + ' of ' + features[i].Object._refObjectName,
               Project: features[i].Object.Project._ref,
               Owner: setOwner()
            });
        }
        epics.push(rallyApi.add({
                ref: features[i].Object._ref,  
                collection: 'UserStories', 
                data: data,
                fetch: ['FormattedID', 'Name', 'PortfolioItem','Feature'],
                requestOptions: {} 
            }));
        data = [];
    }
    return q.all(epics);
}

function makeFeatureForMilestone(milestone){
    var featureForMilestoneLength = 14;
    console.log('MAKING FEATRURE FOR MILESTONE ' + milestone.TargetDate);
    var plannedStartDate = new Date((new Date(milestone.TargetDate.substring(0,10)))
                                         - millisecondsInDay*featureForMilestoneLength);
    var projectRef = milestone.TargetProject._ref;
    var data = {
        Name: milestone._refObjectName + ' feature',
        PlannedEndDate: milestone.TargetDate,
        PlannedStartDate: plannedStartDate,
        Owner: setOwner()
    };
    
    return rallyApi.create({
        type: 'portfolioitem/feature',
        data: data,
        fetch: ['ObjectID','FormattedID','Project'],  
        scope: {
            project: projectRef
        }
    });
}

function setOwner() {
    var min = 0;
    var max = userOids.length-1;
    return 'https://rally1.rallydev.com/slm/webservice/v2.0/user/' + userOids[randomInt(min,max)];
}

function randomInt (low, high) {
        return Math.floor(Math.random() * (high - low + 1) + low);
}

function onSuccess(result) {
    console.log('Success!');
}


function onError(errors) {
    console.log('Failure!', errors);
}
