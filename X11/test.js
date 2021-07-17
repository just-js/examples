const source = `
#include <stdlib.h>
#include <unistd.h>
#include <stdio.h>
#include <fcntl.h>
#include <linux/fb.h>
#include <sys/mman.h>
#include <sys/ioctl.h>

static struct fb_var_screeninfo vinfo;

void screeninfo (int fbfd) {
  if (ioctl(fbfd, FBIOGET_VSCREENINFO, &vinfo) == -1) {
      perror("Error reading variable information");
      return;
  }
  vinfo.activate |= FB_ACTIVATE_NOW | FB_ACTIVATE_FORCE;
}

void activate (int fbfd) {
  if(0 > ioctl(fbfd, FBIOPUT_VSCREENINFO, &vinfo)) {
    perror("Failed to refresh\n");
    return;
  }
}
`

const { ffi } = just.library('ffi')
const { tcc } = just.library('tcc')
const opts = ['-D_GNU_SOURCE']
const includes = []
const libs = []

const code = tcc.compile(source, opts, includes, libs)
if (!code) throw new Error('Could not compile')
tcc.relocate(code)

function wrap (name) {
  const fn = tcc.get(code, name)
  const cif = new ArrayBuffer(8)
  const dv = new DataView(cif)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_UINT32])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const fp = new DataView(new ArrayBuffer(4))
  dv.setBigUint64(0, fp.buffer.getAddress(), true)
  return fd => {
    fp.setUint32(0, fd, true)
    return ffi.ffiCall(cif, fn)
  }
}

const screeninfo = wrap('screeninfo')
const activate = wrap('activate')


const fd = just.fs.open('/dev/fb0', just.fs.O_RDWR)
just.print(fd)
const buf = new ArrayBuffer(1920 * 1080 * 4)
const u32 = new Uint32Array(buf)


for (let y = 0; y < 1080; y++) {
  for (let x = 0; x < 1920; x++) {
    const off = y * 1920
    u32[off + x] = 0xffffffff
  }
}



/*

const fd = just.sys.shmopen('/omgthisiscool')
just.fs.ftruncate(fd, 4096)
const ab = just.sys.mmap(fd, 4096)
const u32 = new Uint32Array(ab)

Atomics.store(u32, 0, 0)

let count = 10000

const t = just.setInterval(() => {
  Atomics.add(u32, 0, 1)
  if (--count === 0) just.clearInterval(t)
}, 1)

just.setInterval(() => {
  just.print(Atomics.load(u32, 0))
}, 1000)

*/

screeninfo(fd)
activate(fd)
while(1) {
  activate(fd)
  just.net.write(fd, buf, buf.byteLength)
  //just.sys.usleep(100000)
}
