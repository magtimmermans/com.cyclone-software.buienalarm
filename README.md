## BuienAlarm app for Homey  

This is an unofficial implementation for the BuienAlarm App on Homey. It uses data from BuitenAlarm.nl
It is based on Buienradar but I prefer BuienAlarm for better data. That is the reason why I implemented this. 

The app is using you longitude and latitude to determain the location to check for rain.

This application is only working in the Netherlands and Belgium (**untested**)

## Version

### V1.1.1
removed some unneeded access rights.

### v1.1.0
Repaired some bugs

Added new triggers
- Rain Percentage, this will calculate for the comming to hours how much time in percentage it will rain. 100% means it rains at least 2 hours. 50% it rains an hour however this can be the first half hour and the last one.
- Rain in mm. This will calculate the amount of rain for the next hour.

Added new conditions
   - Same calculations as for trigger

Added in the settings an overview of rain for 2 hours.

### V1.0.3
This is the first beta version of BuienAlarm App.


