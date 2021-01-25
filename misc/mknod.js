const { S_IFCHR, S_IRUSR, S_IRGRP, S_IWUSR, S_IROTH } = just.fs
const mode = S_IRUSR | S_IRGRP | S_IWUSR | S_IROTH
let r = just.fs.mknod('tty', S_IFCHR, mode, 5, 0)
just.print(r)
r = just.fs.mknod('console', S_IFCHR, mode, 5, 1)
just.print(r)
