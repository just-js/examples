const files = []

const capabilities = [] // list of allowed internal modules, api calls etc. TBD

const modules = [{
  name: 'http',
  obj: [
    'modules/http/http.o',
    'modules/http/picohttpparser.o'
  ]
}, {
  name: 'html',
  obj: [
    'modules/html/html.o'
  ]
}, {
  name: 'blake3',
  obj: [
    'modules/blake3/blake3_lib.o',
    'modules/blake3/blake3.o',
    'modules/blake3/blake3_dispatch.o',
    'modules/blake3/blake3_portable.o',
    'modules/blake3/blake3_avx2_x86-64_unix.o',
    'modules/blake3/blake3_avx512_x86-64_unix.o',
    'modules/blake3/blake3_sse41_x86-64_unix.o'
  ]
}, {
  name: 'zlib',
  obj: [
    'modules/zlib/zlib.o',
    'modules/zlib/deps/zlib-1.2.11/libz.a'
  ]
}, {
  name: 'ffi',
  obj: [
    'modules/ffi/ffi.o'
  ],
  lib: [
    'ffi'
  ]
}, {
  name: 'tcc',
  obj: [
    'modules/tcc/tcc.o',
    'modules/tcc/deps/tcc-0.9.27/libtcc.a'
  ]
}, {
  name: 'openssl',
  obj: [
    'modules/openssl/crypto.o',
    'modules/openssl/tls.o',
    'modules/openssl/deps/openssl-OpenSSL_1_1_1d/libcrypto.a',
    'modules/openssl/deps/openssl-OpenSSL_1_1_1d/libssl.a'
  ]
}, {
  name: 'pg',
  obj: [
    'modules/pg/pg.o',
    'modules/pg/deps/postgresql-12.3/src/interfaces/libpq/libpq.a',
    'modules/pg/deps/postgresql-12.3/src/port/libpgport_shlib.a',
    'modules/pg/deps/postgresql-12.3/src/common/libpgcommon_shlib.a'
  ]
}]

module.exports = { files, modules, capabilities }
