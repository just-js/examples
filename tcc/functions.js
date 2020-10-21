const { ffi } = just.library('ffi.so', 'ffi')
const { tcc } = just.library('tcc.so', 'tcc')

function compile (source, name, returnType, argTypes) {
  const code = tcc.compile(source, ['-O3', '-m64'], [])
  if (!code) throw new Error('Could not compile')
  const cif = new ArrayBuffer(32)
  const dv = new DataView(cif)
  const u8 = new Uint8Array(cif)
  const status = ffi.ffiPrepCif(cif, returnType, argTypes)
  if (status !== ffi.FFI_OK) throw new Error(`Bad Status ${status}`)
  tcc.relocate(code)
  const fn = tcc.get(code, name)
  let wrapper
  if (returnType === ffi.FFI_TYPE_UINT32) {
    wrapper = v => {
      dv.setUint32(0, v, true)
      return ffi.ffiCall(cif, fn)
    }
    wrapper[Symbol('cif')] = cif
    return wrapper
  } else if (returnType === ffi.FFI_TYPE_DOUBLE) {
    wrapper = v => {
      dv.setFloat32(0, v, true)
      just.print(u8[0])
      just.print(u8[1])
      just.print(u8[2])
      just.print(u8[3])
      just.print(u8[4])
      just.print(u8[5])
      just.print(u8[6])
      just.print(u8[7])
      return ffi.ffiCall(cif, fn)
    }
    wrapper[Symbol('cif')] = cif
    return wrapper
  }
}

const source = `
#include <stdint.h>
#include <stdio.h>

typedef union {
  double d; 
  struct
  { 
      unsigned int mantissa : 23; 
      unsigned int exponent : 8; 
      unsigned int sign : 1; 
  } raw; 
} myfloat;

void printBinary(int n, int i) { 
    int k; 
    for (k = i - 1; k >= 0; k--) { 
        if ((n >> k) & 1) 
            printf("1"); 
        else
            printf("0"); 
    } 
} 

void printIEEE(myfloat var) { 
    printf("%d | ", var.raw.sign); 
    printBinary(var.raw.exponent, 8); 
    printf(" | "); 
    printBinary(var.raw.mantissa, 23); 
    printf("\n"); 
} 

uint32_t test1 (uint32_t n) {
  return n + 1;
}

double test2 (double n) {
  double x = 1;
  printIEEE((myfloat)n);
  fprintf(stderr, "-----------\n");
  fprintf(stderr, "%e\n", x);
  fprintf(stderr, "-----------\n");
  uint8_t* v = (uint8_t*)&x;
  fprintf(stderr, "0: %hhu\n", v[0]);
  fprintf(stderr, "1: %hhu\n", v[1]);
  fprintf(stderr, "2: %hhu\n", v[2]);
  fprintf(stderr, "3: %hhu\n", v[3]);
  fprintf(stderr, "4: %hhu\n", v[4]);
  fprintf(stderr, "5: %hhu\n", v[5]);
  fprintf(stderr, "6: %hhu\n", v[6]);
  fprintf(stderr, "7: %hhu\n", v[7]);
  fprintf(stderr, "-----------\n");
  fprintf(stderr, "%e\n", n);
  fprintf(stderr, "-----------\n");
  v = (uint8_t*)&n;
  fprintf(stderr, "0: %hhu\n", v[0]);
  fprintf(stderr, "1: %hhu\n", v[1]);
  fprintf(stderr, "2: %hhu\n", v[2]);
  fprintf(stderr, "3: %hhu\n", v[3]);
  fprintf(stderr, "4: %hhu\n", v[4]);
  fprintf(stderr, "5: %hhu\n", v[5]);
  fprintf(stderr, "6: %hhu\n", v[6]);
  fprintf(stderr, "7: %hhu\n", v[7]);
  return n + 1;
}
`
let r = 0

/*
const test1 = compile(source, 'test1', ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_UINT32])
r = test1(1)
just.print(r)
*/

const test2 = compile(source, 'test2', ffi.FFI_TYPE_DOUBLE, [ffi.FFI_TYPE_DOUBLE])
r = test2(1)
just.print(r)
