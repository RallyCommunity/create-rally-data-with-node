//this script updates tasks in current iteration based on settings in config file

var config = require('./config');
var q = require('q');
var rl = require('readline');

var today = new Date().toISOString();
var workspaceRef = '/workspace/33663719110';
var currentConfig = {};    
    
ask('who are you?')
    .then(parseAnswer)
    .then(createRallyApi)
    .then(findTasksInCurrentIteration)
    .then(updateTasks)
    .then(onSuccess)
    .fail(onError);
    
function ask(question) {
    var deferred = q.defer();

    var r = rl.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    r.question(question + '\n', function(answer) {
        r.close();
        deferred.resolve(answer);
    });

  return deferred.promise;
};

function parseAnswer(input){
    var deferred = q.defer();
    currentConfig = findUser(input);
    var key = currentConfig['apiKey'];
    deferred.resolve(key);
    return deferred.promise; 
}

function findUser(input){
    if(config.hasOwnProperty(input)){
        return config[input];   
    }
    else{
        return null;
    }
}
function createRallyApi(apiKey){
    rally = require('rally'),
    queryUtils = rally.util.query,
    rallyApi = rally({
        apiKey: apiKey,
        server: 'https://rally1.rallydev.com',  
        requestOptions: {
            headers: {
                'X-RallyIntegrationName': 'Nick\'s update tasks in current iteration',  
                'X-RallyIntegrationVendor': 'Rally Labs',             
                'X-RallyIntegrationVersion': '1.0'                    
            }
        }
    });
    var deferred = q.defer();
    deferred.resolve(rallyApi);
    return deferred.promise; 
    
}

function findTasksInCurrentIteration(rallyApi){
    var query = queryUtils.where('Iteration.StartDate', '<=', today);
    query = query.and('Iteration.EndDate', '>=', today);
    query = query.and('Owner','=',currentConfig['ref']);
    query = query.and('State','=',currentConfig['currentState']);
    
    return rallyApi.query({
        type: 'task',
        limit: Infinity,
        fetch: ['FormattedID', 'Name', 'Iteration', 'State','Project','Owner'],
        query: query,
        scope: {
            workspace: workspaceRef
        }
    });  
}


function updateTasks(result){
    console.log('Found ', result.Results.length, 'tasks');
    if (result.Results.length > 0) {
        var tasksToUpdate = randomInt(10, 20); //persent of total tasks to update
        var length = Math.floor((tasksToUpdate/100)*result.Results.length);
        console.log('length',length);
        var updatedTasks = [];
        for(var i=0;i<length;i++){
            updatedTasks.push(updateTask(result.Results[i]));
        }
        return q.all(updatedTasks);
    }
    else{
        return 'nothing to update';
    }
}

function updateTask(task){
    var nextState = currentConfig['nextState'];
    setTimeout(function(){
        console.log('updating ', task._refObjectName);
        return rallyApi.update({
        ref: task._ref,
        data: {
            State: nextState
        },
        fetch: ['FormattedID']
    });
    },10000)
    
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