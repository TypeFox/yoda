//  Copyright 2018 Hewlett Packard Enterprise Development LP
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software 
// and associated documentation files (the "Software"), to deal in the Software without restriction, 
// including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, 
// and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, 
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all copies or 
// substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
// PURPOSE AND NONINFRINGEMENT.
//
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR 
// OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF 
// OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


function getUrlParams() {
	var params = "owner=" + $("#owner").val();
	params += "&repolist=" + $("#repolist").val();
	if ($("#startdate").val() != "") {
		params += "&startdate=" + $("#startdate").val();
	}
	if ($("#enddate").val() != "") {
		params += "&enddate=" + $("#enddate").val();
	}
	if ($("#interval").val() != "") {
		params += "&interval=" + $("#interval").val();
	}
	if ($("#labelfilter").val() != "") {
		params += "&labelfilter=" + $("#labelfilter").val();
	}
	if ($("#milestonefilter").val() != "") {
		params += "&milestonefilter=" + $("#milestonefilter").val();
	}
	if ($("#assigneefilter").val() != "") {
		params += "&assigneefilter=" + $("#assigneefilter").val();
	}
	if ($("#title").val() != "") {
		params += "&title=" + $("#title").val();
	}
	return params;
}

function determineStartAndInterval(firstIssueDate, interval) {
	var today = new Date();
	today.setHours(0);
	today.setMinutes(0);
	today.setSeconds(0);
	var startDay = today.getDate();

	var days = (today - firstIssueDate) / (24 * 60 * 60 * 1000);
	console.log("Days: " + days);

	// Do we need to play with interval?
	if (interval.slice(-1) != 'm' && (days / interval) > 25) {
		// shift to monthly
		interval = '1m';
	}

	// Ok, let's determine startdate
	for (var startDate = today; startDate >= firstIssueDate; yoda.advanceDate(startDate, '-' + interval, startDay)) {
		// NOP
	};

	return {
		startDate: startDate,
		interval: interval
	};
}

//---------------------------------------
//Issues have been retrieved. Time to analyse data and draw the chart.
function createChartLT(issues) {
	// Check date fields for possible +/- notations.
	$("#startdate").val(yoda.handleDateDelta($("#startdate").val()));
	$("#enddate").val(yoda.handleDateDelta($("#enddate").val()));

	console.log("Creating LT. No issues (after filtering out pull requests): " + issues.length);

	// Issue analysis loop.
	// First, let's sort issues by submit date
	issues.sort(function(issue_1, issue_2) {
		if (yoda.createDate(issue_1) < yoda.createDate(issue_2))
			return -1;
		else
			return 1;
	});

	// Let's set today as 0:0:0 time (so VERY start of the day)
	var today = new Date();
	today.setHours(0);
	today.setMinutes(0);
	today.setSeconds(0);

	var interval = $("#interval").val();
	console.log("Interval: " + interval);

	var startDateString = $("#startdate").val();
	if (startDateString == "") {
		// If blank, makes sense to start with the date of the first issue.
		var firstIssueDate = new Date(yoda.createDate(issues[0]));
		var update = determineStartAndInterval(firstIssueDate, interval);
		interval = update.interval;
		var startDate = update.startDate;
	} else {
		var startDate = new Date(startDateString);
	}
	console.log("Start date: " + startDate);

	var endDateString = $("#enddate").val();
	if (endDateString == "") {
		var endDate = new Date(today);
	} else {
		endDate = new Date(endDateString);
	}
	endDate.setHours(23);
	endDate.setMinutes(59);
	endDate.setSeconds(59);
	console.log("End date: " + endDate);


	// Then, let's run through the issues to build a date array.


	// Then, let's loop the dates.
	var firstIssueDate = yoda.createDate(issues[0]);
	console.log("first: " + firstIssueDate);
	var lastIssueDate = yoda.createDate(issues.slice(-1)[0]);
	console.log("last: " + lastIssueDate);
	var endIssueDate = new Date(lastIssueDate);

	// date loop
	// Start at startDate
	var openArray = [];
	var closedArray = [];
	for (var date = new Date(firstIssueDate); date <= endIssueDate; date.setDate(date.getDate() + 1)) {
		var d = yoda.formatDate(date);
		openArray[d] = 0;
		closedArray[d] = 0;
	}

	for (var i = 0; i < issues.length; i++) {
		// Add to open and/or closed item.
		var createdAt = yoda.createDate(issues[i]);
		var dTemp = new Date(createdAt);
		var d = yoda.formatDate(dTemp);
		openArray[d]++;

		var closedAt = yoda.closeDate(issues[i]);
		if (closedAt != null) {
			var dTemp = new Date(closedAt);
			var d = yoda.formatDate(dTemp);
			closedArray[d]++;
		}
	}

	// Debug
	//	for (var date = new Date(firstIssueDate); date <= today; date.setDate(date.getDate() + 1)) {
	//		var d = yoda.formatDate(date);
	//		console.log(d + ", " + openArray[d] + ", " + closedArray[d]);
	//	}

	// Data arrays for issue lead times.
	var leadTimeArray = [];
	var dateArray = [];

	var startDay = new Date(startDate).getDate();
	for (var date = new Date(startDate); date <= endDate; yoda.advanceDate(date, interval, startDay)) {
		var endOfDate = new Date(date);
		endOfDate.setHours(23);
		endOfDate.setMinutes(59);
		endOfDate.setSeconds(59);

		// Push to date array
		dateArray.push(yoda.formatDate(date));

		// Prepare data array
		var noOpen = 0;
		var noClosed = 0;

		// Ok, now let's count issues
		for (var i = 0; i < issues.length; i++) {
			// We count all issues. Just a matter of splitting them into either one of the data pools.
			// closed => index 0
			// open => index 1
			var submitDateString = yoda.createDate(issues[i]);
			var submitDate = new Date(submitDateString);

			if (submitDate > endOfDate) {
				// Submitted later - forget it.
				continue;
			}

			// Closed, and closed before OR DURING date?
			var closedString = yoda.closeDate(issues[i]);
			if (closedString != null) {
				var closedDate = new Date(closedString);

				// was it open at date?
				if (closedDate < endOfDate) {
					// closed before, so closed
					noClosed++; // count as closed
				} else {
					noOpen++;   // count as open
				}
			} else {
				// still open
				noOpen++;   // count as open
			}
		}

		// Ok, now we know number of open and no of closed.
		// Need to look into array to find a good ponit.
		var cumClosed = 0;
		var cumOpen = 0;
		var duration = NaN;
		for (var backDate = new Date(firstIssueDate); backDate <= endOfDate; backDate.setDate(backDate.getDate() + 1)) {
			var d = yoda.formatDate(backDate);
			cumOpen += (openArray[d] - closedArray[d]);
			cumClosed += closedArray[d];
			//			console.log(backDate, cumOpen, cumClosed);
			if (cumOpen + cumClosed >= noClosed) {

				duration = Math.ceil((endOfDate - backDate) / (1000 * 60 * 60 * 24));
				//				console.log(">> BREAK", cumOpen, cumClosed, noClosed, d, date, duration);				
				break;
			}
		}

		// TBD
		//		console.log("For date: " + date + " pushing value " + duration);
		leadTimeArray.push(duration);
	}

	// -----------------------------------------------------------
	// DATA. Draw the chart
	var ctx = document.getElementById("canvas").getContext("2d");
	if (window.myMixedChart != null)
		window.myMixedChart.destroy();

	var chartTitle = "CFD / Lead time / GitHub Issues " + $("#owner").val() + "/" + $("#repolist").val();
	if ($("#title").val() != "") {
		chartTitle = $("#title").val();
	}

	console.log(leadTimeArray.length, dateArray.length);

	window.myMixedChart = new Chart(ctx, {
		type: 'line',
		data: {
			labels: dateArray,
			datasets: [{
				type: 'line',
				label: 'Lead time',
				borderWidth: 3,
				yAxisID: "yleft",
				fill: false,
				data: leadTimeArray,
				borderColor: yoda.getColor("lineBackground")
			}]
		},
		options: {
			showDatapoints: true,
			responsive: true,
			plugins: {
				title: {
					display: true,
					text: chartTitle,
					font: {
                        size: 20                    
					}
				}
			},
			tooltips: {
				mode: 'index',
				intersect: true
			},
			scales: {
				yleft: {
					title: {
						display: true,
						text: 'Days',
						font: {
                	   		size: 16                    
						}
					},
					beginAtZero: true,
					stacked: true,
					position: "left",
					ticks: {
						beginAtZero: true
					},
					grid: {
						color: yoda.getColor('gridColor')
					}
				},
				x: {
					stacked: true,
					grid: {
						color: yoda.getColor('gridColor')
					}
				}
			}
		}
	});

	yoda.updateUrl(getUrlParams() + "&draw=lt");
}



// ---------------------------------------
// Issues have been retrieved. Time to analyse data and draw the chart.
function createChartCFD(issues) {
	// Check date fields for possible +/- notations.
	$("#startdate").val(yoda.handleDateDelta($("#startdate").val()));
	$("#enddate").val(yoda.handleDateDelta($("#enddate").val()));

	console.log("Creating chart. No issues (after filtering out pull requests): " + issues.length);

	// Let's set today as 0:0:0 time (so VERY start of the day)
	var today = new Date();
	today.setHours(0);
	today.setMinutes(0);
	today.setSeconds(0);

	// First, let's sort issues by submit date
	issues.sort(function(issue_1, issue_2) {
		if (yoda.createDate(issue_1) < yoda.createDate(issue_2))
			return -1;
		else
			return 1;
	});

	var interval = $("#interval").val();
	console.log("Interval: " + interval);

	var startDateString = $("#startdate").val();
	if (startDateString == "") {
		// If blank, makes sense to start with the date of the first issue.
		var firstIssueDate = new Date(yoda.createDate(issues[0]));
		var update = determineStartAndInterval(firstIssueDate, interval);
		interval = update.interval;
		var startDate = update.startDate;
	} else {
		var startDate = new Date(startDateString);
	}
	console.log("Start date: " + startDate);

	var endDateString = $("#enddate").val();
	if (endDateString == "") {
		var endDate = new Date(today);
	} else {
		endDate = new Date(endDateString);
	}
	endDate.setHours(23);
	endDate.setMinutes(59);
	endDate.setSeconds(59);
	console.log("End date: " + endDate);

	// Data arrays for issues. For now contains closed and open. Later can be expanded to more substates.
	var dataArraySize = 2;
	var dateArray = [];
	var dataArray = new Array(dataArraySize);
	for (i = 0; i < dataArray.length; i++) {
		dataArray[i] = new Array();
	}
	var bars = [];
	bars[0] = "closed";
	bars[1] = "open";

	// date loop
	// Start at startDate

	// Need to consider previous date, so that we can observe interval.
	var startDay = new Date(startDate).getDate();
	for (var date = new Date(startDate); date <= endDate; yoda.advanceDate(date, interval, startDay)) {
		//		console.log('date: ' +  date + ", enddate: " + endDate );
		var endOfDate = new Date(date);
		endOfDate.setHours(23);
		endOfDate.setMinutes(59);
		endOfDate.setSeconds(59);

		// Push to date array
		dateArray.push(yoda.formatDate(date));

		// Prepare data array
		var dataArrayForDay = new Array(dataArraySize);
		for (var l = 0; l < dataArraySize; l++) {
			dataArrayForDay[l] = 0;
		};

		// Ok, now let's count issues
		for (var i = 0; i < issues.length; i++) {
			// We count all issues. Just a matter of splitting them into either one of the data pools.
			// closed => index 0
			// open => index 1
			var submitDateString = yoda.createDate(issues[i]);
			var submitDate = new Date(submitDateString);

			if (submitDate > endOfDate) {
				// Submitted later - forget it.
				continue;
			}

			// Closed, and closed before OR DURING date?
			var closedString = yoda.closeDate(issues[i]);
			if (closedString != null) {
				var closedDate = new Date(closedString);

				// was it open at date?
				if (closedDate < endOfDate) {
					// closed before, so closed
					dataArrayForDay[0]++;  // count as closed
				} else {
					dataArrayForDay[1]++;  // count as open
				}
			} else {
				// still open
				dataArrayForDay[1]++;     // count as open
			}
		}
		for (var i = 0; i < dataArraySize; i++) {
			dataArray[i].push(dataArrayForDay[i]);
		}
	}

	// Ready, let's push the bars
	var datasetArray = [];
	for (var b = 0; b < dataArraySize; b++) {
		datasetArray.push({
			type: 'line',
			yAxisID: "yleft",
			label: bars[b],
			fill: true,
			data: dataArray[b],
			backgroundColor: yoda.barColors[b + 2]
		});
	}


	// We will push data to a 
	var chartData = {
		labels: dateArray,
		datasets: datasetArray
	};

	var chartScales = {
		yleft: {
			title: {
				display: true,
				text: '# of issues',
				font: {
                   size: 16                    
				}
			},
			stacked: true,
			position: "left",
			ticks: {
				beginAtZero: true
			},
			grid: {
				color: yoda.getColor('gridColor')
			}
		},
		x: {
			stacked: true,
			grid: {
				color: yoda.getColor('gridColor')
			}
		}
	};

	// -----------------------------------------------------------
	// DATA. Draw the chart
	var ctx = document.getElementById("canvas").getContext("2d");
	if (window.myMixedChart != null)
		window.myMixedChart.destroy();

	var chartTitle = "CFD / Github Issues " + $("#owner").val() + "/" + $("#repolist").val();
	if ($("#title").val() != "") {
		chartTitle = $("#title").val();
	}

	window.myMixedChart = new Chart(ctx, {
		type: 'bar',
		data: chartData,
		options: {
			showDatapoints: true,
			responsive: true,
			plugins: {
				title: {
					display: true,
					text: chartTitle,
					font: {
                        size: 20                    
					}
				},
			},
			tooltips: {
				mode: 'index',
				intersect: true
			},
			scales: chartScales,
		},
	});

	yoda.updateUrl(getUrlParams() + "&draw=cfd");
}

// -------------------------------

// TODO: Enhance this
function errorFunc(errorText) {
	alert("ERROR: " + errorText);
}


// ----------------
var _chartType = "";
function storeIssuesThenCreateChart(issues) {
	// Filter out issues not matching specified milestonefilter, if any.
	if ($("#milestonefilter").val() != "") {
		mFilter = $("#milestonefilter").val().split(",");
		console.log(mFilter);

		milestonedIssues = [];
		for (var i = 0; i < issues.length; i++) {
			includeIssue = true;
			for (var j = 0; j < mFilter.length; j++) {
				var positiveFilter = (mFilter[j].indexOf("-") != 0);  // Positive if NOT starting with -

				if ((positiveFilter && (issues[i].milestone == null || issues[i].milestone.title != mFilter[j])) ||
					(!positiveFilter && issues[i].milestone != null && issues[i].milestone.title == mFilter[j].substr(1))) {
					includeIssue = false;
					break;
				}
			}
			if (includeIssue == true)
				milestonedIssues.push(issues[i]);
		}

		issues = milestonedIssues;
	}

	// Check for no issues
	if (issues.length == 0) {
		var ctx = document.getElementById("canvas").getContext("2d");
		if (window.myMixedChart != null)
			window.myMixedChart.destroy();
		yoda.showSnackbarError("No issues.");
		return;
	}

	if (_chartType == "CFD") {
		createChartCFD(issues);
	} else {
		createChartLT(issues);
	}
}

// -------------------------

function addAssigneeFilter(repo) {
	if ($("#assigneefilter").val() == "")
		return "";
	else
		return "&assignee=" + $("#assigneefilter").val(); 
}


function startChart(chartType) {
	_chartType = chartType
	if ($("#repolist").val() == "")
		yoda.updateGitHubIssuesOrg($("#owner").val(), $("#labelfilter").val(), "all", storeIssuesThenCreateChart, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000); });
	else
		yoda.updateGitHubIssuesRepos($("#owner").val(), $("#repolist").val(), $("#labelfilter").val(), "all", addAssigneeFilter, storeIssuesThenCreateChart, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000); });
}

// --------------
function githubAuth() {
	console.log("Github authentisation: " + $("#user").val() + ", token: " + $("#token").val());
	yoda.gitAuth($("#user").val(), $("#token").val());
}

// --------------

//Label drawing
Chart.defaults.font.size = 16;
Chart.register({
	id: 'yoda-label',
	afterDatasetsDraw: function(chartInstance, easing) {
		var ctx = chartInstance.ctx;

		chartInstance.data.datasets.forEach(function(dataset, i) {
			var meta = chartInstance.getDatasetMeta(i);
			if (!meta.hidden) {
				mod = 1;
				m = 0;
				if (meta.data.length > 30) {  // If we have lots of data sets, don't show all, they will overlap/mess up
					mod = 2;
					if (meta.data.length % 2 == 0)
						m = 1; // Start counting at 1 if even number of datasets. This will make sure we get the last (more recent) number in graph.
				}

				meta.data.forEach(function(element, index) {
					if (m++ % mod == 0) {
						// Draw the text in black, with the specified font
						if (i == 0)
							ctx.fillStyle = yoda.bestForeground(dataset.backgroundColor, yoda.getColor('htmlBackgound'), yoda.getColor('fontContrast'));
						else
							ctx.fillStyle = yoda.bestForeground(dataset.backgroundColor, yoda.getColor('fontContrast'), yoda.getColor('htmlBackgound'));
						ctx.font = Chart.helpers.fontString(Chart.defaults.font.size, Chart.defaults.font.style, Chart.defaults.font.family);

						// Just naively convert to string for now
						var dataString = dataset.data[index].toString();

						// Make sure alignment settings are correct
						ctx.textAlign = 'center';
						ctx.textBaseline = 'middle';

						var padding = 5;
						var position = element.tooltipPosition();

						// Label inside bar ... gives a bit of trouble at buttom...
						if (i == 0) 
							ctx.fillText(dataString, position.x, position.y + (Chart.defaults.font.size / 2) + padding);
						else
							ctx.fillText(dataString, position.x, position.y - padding);
					}
				});
			}
		});
	}
});

Chart.register({
	id: "yoda-background",
	beforeDraw: function(c) {
		var ctx = c.ctx;
		ctx.fillStyle = yoda.getColor('htmlBackground');
		ctx.fillRect(0, 0, c.canvas.width, c.canvas.height);
	}
});
