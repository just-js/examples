const { ffi } = just.library('ffi.so', 'ffi')
const { tcc } = just.library('tcc.so', 'tcc')

function get (code, name, returnType, argTypes) {
  const cif = new ArrayBuffer(32)
  const dv = new DataView(cif)
  const status = ffi.ffiPrepCif(cif, returnType, argTypes)
  if (status !== ffi.FFI_OK) throw new Error(`Bad Status ${status}`)
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
      return ffi.ffiCall(cif, fn)
    }
    wrapper[Symbol('cif')] = cif
    return wrapper
  } else if (returnType === ffi.FFI_TYPE_POINTER) {
    wrapper = buf => {
      dv.setBigUint64(0, buf.getAddress(), true)
      return ffi.ffiCall(cif, fn)
    }
    wrapper[Symbol('cif')] = cif
    return wrapper
  }
}

function compile (source, opts = [], includes = [], libs = []) {
  const code = tcc.compile(source, opts, includes, libs)
  if (!code) throw new Error('Could not compile')
  tcc.relocate(code)
  return code
}

module.exports = { compile, get, ffi, tcc }
