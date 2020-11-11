const { tcc } = just.library('tcc.so', 'tcc')
const source = `
#include <stdio.h>
#include <unistd.h>

extern char **environ;

void* _register_just_http () {
  //return (void*)just::blake3::Init;
  int size = 0;
  while (environ[size]) size++;
  for (int i = 0; i < size; ++i) {
    const char *var = environ[i];
    fprintf(stderr, "%s\n", var);
  }
  return 0;
}
`
const opts = ['-D_GNU_SOURCE']
const includes = []
const libs = []
const code = tcc.compile(source, opts, includes, libs)
if (!code) throw new Error('Could not compile')
tcc.relocate(code)
const fn = tcc.get(code, '_register_just_http')
just.print(fn)
