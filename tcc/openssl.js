const { tcc } = just.library('tcc')
const { ffi } = just.library('ffi')
const source = `
#include <openssl/ec.h>      // for EC_GROUP_new_by_curve_name, EC_GROUP_free, EC_KEY_new, EC_KEY_set_group, EC_KEY_generate_key, EC_KEY_free
#include <openssl/ecdsa.h>   // for ECDSA_do_sign, ECDSA_do_verify
#include <openssl/obj_mac.h> // for NID_secp192k1

static int create_signature(unsigned char* hash)
{
    int function_status = -1;
    EC_KEY *eckey=EC_KEY_new();
    if (NULL == eckey)
    {
        printf("Failed to create new EC Key\n");
        function_status = -1;
    }
    else
    {
        EC_GROUP *ecgroup= EC_GROUP_new_by_curve_name(NID_secp192k1);
        if (NULL == ecgroup)
        {
            printf("Failed to create new EC Group\n");
            function_status = -1;
        }
        else
        {
            int set_group_status = EC_KEY_set_group(eckey,ecgroup);
            const int set_group_success = 1;
            if (set_group_success != set_group_status)
            {
                printf("Failed to set group for EC Key\n");
                function_status = -1;
            }
            else
            {
                const int gen_success = 1;
                int gen_status = EC_KEY_generate_key(eckey);
                if (gen_success != gen_status)
                {
                    printf("Failed to generate EC Key\n");
                    function_status = -1;
                }
                else
                {
                    ECDSA_SIG *signature = ECDSA_do_sign(hash, strlen(hash), eckey);
                    if (NULL == signature)
                    {
                        printf("Failed to generate EC Signature\n");
                        function_status = -1;
                    }
                    else
                    {

                        int verify_status = ECDSA_do_verify(hash, strlen(hash), signature, eckey);
                        const int verify_success = 1;
                        if (verify_success != verify_status)
                        {
                            printf("Failed to verify EC Signature\n");
                            function_status = -1;
                        }
                        else
                        {
                            printf("Verifed EC Signature\n");
                            function_status = 1;
                        }
                    }
                }
            }
            EC_GROUP_free(ecgroup);
        }
        EC_KEY_free(eckey);
    }

  return function_status;
}

`
const opts = ['-D_GNU_SOURCE']
const includes = ['../../modules/openssl/deps/openssl-OpenSSL_1_1_1d/include']
const libs = ['../../modules/openssl/deps/openssl-OpenSSL_1_1_1d/libcrypto.a']

const code = tcc.compile(source, opts, includes, libs)
if (!code) throw new Error('Could not compile')
tcc.relocate(code)

function wrap () {
  const fn = tcc.get(code, 'create_signature')
  const params = [ffi.FFI_TYPE_POINTER]
  const dv = new DataView(new ArrayBuffer(8 * params.length))
  const cif = dv.buffer
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, params)
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const fdv = new DataView(new ArrayBuffer(4))
  dv.setBigUint64(0, fdv.buffer.getAddress(), true)
  const bufv = new DataView(new ArrayBuffer(8))
  dv.setBigUint64(8, bufv.buffer.getAddress(), true)
  const sizev = new DataView(new ArrayBuffer(4))
  dv.setBigUint64(16, sizev.buffer.getAddress(), true)
  function create (fd, str, len = just.sys.utf8Length(str)) {
    fdv.setUint32(0, fd, true)
    bufv.setBigUint64(0, ArrayBuffer.fromString(str).getAddress(), true)
    sizev.setUint32(0, len, true)
    return ffi.ffiCall(cif, fn)
  }
  return { create }
}

just.print(wrap()("hello"))
