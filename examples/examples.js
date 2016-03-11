
;
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['meTrapFocus'], factory);
  } else {
    factory(meTrapFocus);
  }
}(this, function (meTrapFocus) {

var f1, f2, f3,
  create1 = document.getElementById('create-1'),
  create2 = document.getElementById('create-2'),
  create3 = document.getElementById('create-3'),
  destroy1 = document.getElementById('destroy-1'),
  destroy2 = document.getElementById('destroy-2'),
  destroy3 = document.getElementById('destroy-3')
  ;

create1.addEventListener('click', function () {
  f1 = new meTrapFocus('hold-focus-1');
  create1.setAttribute('disabled','disabled');
  destroy1.removeAttribute('disabled');

});
create2.addEventListener('click', function () {
  f2 = new meTrapFocus('hold-focus-2');
  create2.setAttribute('disabled','disabled');
  destroy2.removeAttribute('disabled');
});
create3.addEventListener('click', function () {
  f3 = new meTrapFocus('hold-focus-3');
  create3.setAttribute('disabled','disabled');
  destroy3.removeAttribute('disabled');
});

destroy1.addEventListener('click', function () {
  f1 = f1.destroy();
  create1.removeAttribute('disabled');
  destroy1.setAttribute('disabled','disabled');
});
destroy2.addEventListener('click', function () {
  f2 = f2.destroy();
  create2.removeAttribute('disabled');
  destroy2.setAttribute('disabled','disabled');
});
destroy3.addEventListener('click', function () {
  f3 = f3.destroy();
  create3.removeAttribute('disabled');
  destroy3.setAttribute('disabled','disabled');
});


// reset the form elements on load
create1.removeAttribute('disabled');
destroy1.setAttribute('disabled','disabled');
create2.removeAttribute('disabled');
destroy2.setAttribute('disabled','disabled');
create3.removeAttribute('disabled');
destroy3.setAttribute('disabled','disabled');

var radios = document.querySelectorAll('input[type=radio]');
for (var i=0; i<radios.length;i++) {
  radios[i].checked = false;
}

}));