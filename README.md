It is said that the first task of a Jedi Knight is to construct their own
light saber.

The first task of a CoffeeScript developer is to construct a tool for automatic
execution of CoffeeScript tests.

This is my light saber for CoffeeScript development. You're welcome to study it and
improve on it.

To get it working:

1. Install Node.js
2. Run <code>node autotest-server.js</code>
3. Go to http://localhost:10000
4. Change the test and sources files to use in SpecRunner.html

The rig supports tests and lib code in JavaScript and CoffeeScript.
Whenever a .coffee file is changed on disk, it will compile the corresponding
.js file. Whenever a .js file is changed, the web page will refresh.

Known issues:
-------------
* Occasionally, timing issues when compiling .coffee files may crash the server

