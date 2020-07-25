## build dependencies
tar
gzip
ld
curl
g++
make

OR

use docker
```
docker run -it --rm -v $(pwd)
```

## command to create and build just runtime in your current directory
```bash
JUST_HOME=$(pwd) just -e 'just.args.splice(1, 1); just.require("build").build()' runtime-builder
```