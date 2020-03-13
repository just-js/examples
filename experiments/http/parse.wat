(module
  (import "js" "memory" (memory 2)) ;; 20 x 64k = 1310720 bytes. 1MB (1048576) for data, 256k (262144) for offsets
  (func (export "parse") (param $off i32) (param $end i32) (result i32)
    (local $offsets i32)
    (local $target i32)
    (local $count i32)
    (local $len i32)
    (set_local $count (i32.const 0))
    (set_local $offsets (i32.const 0))
    (set_local $target (i32.const 168626701))
    (set_local $len (i32.sub (get_local $end) (get_local $off)))
    (block $exit
      (loop $loop
        (if (i32.eq (get_local $target) (i32.load (get_local $off)))
          (then 
            (i32.store (get_local $offsets) (get_local $off))
            (set_local $offsets (i32.add (get_local $offsets) (i32.const 4)))
            (set_local $count (i32.add (get_local $count) (i32.const 1)))
          )
        )
        (set_local $off (i32.add (get_local $off) (i32.const 1)))
        (br_if $loop (i32.lt_u (get_local $off) (get_local $end)))
      )
      (i32.store (get_local $offsets) (get_local $off))
    )
    (return (get_local $count))
  )
)