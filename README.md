Create Rally data
=========================

## Overview
These scripts written with [rally-node](https://github.com/RallyTools/rally-node) create Rally test data, and should be run in the following order:

1. *timeboxes-features-epics-milestones.js* creates releases, iterations in all projects in the workspace; creates milestones, features scheduled for releases, features linked to milestones, and stories parented by features in all projects in the workspace exept leaf projects that have no child projects. The numbers of releases per project, iterations per release, features per release, etc. is set in the code. Milestone dates are generated pseudo-randomly within certain dates.
2. *create-schedule-stories-tasks.js* creates leaf stories, schedules them for current releases and iterations, creates tasks, sets stories created in the previous step as parents of scheduled stories. If, for example, you set your iterations length to two weeks run this script once in two weeks. 
3. *update-current-tasks.js* updates State of tasks in current iteration. Run it as many times as needed to update tasks during current iteration and fake gradual progression of work. The script prompts a user for a name, and uses a config file to read apiKey of a user designated to be the author of updates, constructs a query based on current state of Tasks and sets next State. For each run a random percentage of tasks (between 10 and 20%) returned by the query is being updated.
That can be changed in `var tasksToUpdate = randomInt(10, 20);`



This app is vailable AS IS. It is NOT supported by Rally.
## License

AppTemplate is released under the MIT license.  See the file [LICENSE](./LICENSE) for the full text.

##Documentation for SDK

You can find the documentation on our help [site.](https://github.com/RallyTools/rally-node/wiki/User-Guide)