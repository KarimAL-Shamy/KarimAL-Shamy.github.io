// Sorting Visualizer Main Controller
var inp_as = document.getElementById('a_size');
var array_size = inp_as ? inp_as.value : 50;
var inp_gen = document.getElementById('a_generate');
var inp_aspeed = document.getElementById('a_speed');
var butts_algos = document.querySelectorAll('.algos button');

var div_sizes = [];
var divs = [];
var margin_size;
var cont = document.getElementById('array_container');
if (cont) {
    cont.style.flexDirection = 'row-reverse';
}

function generate_array() {
    if (!cont || !inp_as) return;
    cont.innerHTML = '';

    for (var i = 0; i < array_size; i++) {
        div_sizes[i] = Math.floor(Math.random() * 0.5 * (inp_as.max - inp_as.min)) + 10;
        divs[i] = document.createElement('div');
        cont.appendChild(divs[i]);
        margin_size = 0.1;
        divs[i].style.margin = '0% ' + margin_size + '%';
        divs[i].style.backgroundColor = 'purple';
        divs[i].style.width = (100 / array_size - (2 * margin_size)) + '%';
        divs[i].style.height = div_sizes[i] + '%';
    }
}

function update_array_size() {
    if (inp_as) {
        array_size = inp_as.value;
    }
    generate_array();
}

if (inp_gen) {
    inp_gen.addEventListener('click', generate_array);
}
if (inp_as) {
    inp_as.addEventListener('input', update_array_size);
}

function disable_buttons() {
    for (var i = 0; i < butts_algos.length; i++) {
        butts_algos[i].className = 'butt_locked';
        butts_algos[i].disabled = true;
    }
    if (inp_as) inp_as.disabled = true;
    if (inp_gen) inp_gen.disabled = true;
    if (inp_aspeed) inp_aspeed.disabled = true;
}

function runalgo() {
    disable_buttons();
    this.classList.add('butt_selected');
    switch (this.innerHTML.trim()) {
        case 'Bubble':
            if (typeof Bubble === 'function') Bubble();
            break;
        case 'Selection':
            if (typeof Selection_sort === 'function') Selection_sort();
            break;
        case 'Insertion':
            if (typeof Insertion === 'function') Insertion();
            break;
        case 'Merge':
            if (typeof Merge === 'function') Merge();
            break;
        case 'Quick':
            if (typeof Quick === 'function') Quick();
            break;
        case 'Heap':
            if (typeof Heap === 'function') Heap();
            break;
    }
}

for (var i = 0; i < butts_algos.length; i++) {
    butts_algos[i].addEventListener('click', runalgo);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', update_array_size);
} else {
    update_array_size();
}
