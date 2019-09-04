import def, {Foo1, Bar1} from 'foobar';
import {Foo2, Bar2} from 'foobar';

async function regularAsyncFn() {
    return Foo1;
}

function regularSyncFn() {
    return Foo2;
}

async function nestedAsyncFn() {
    const foo = () => {
        return def;
    };
}

const asyncBodyFatFn = async () => { Foo1; };
const asyncBodylessFatFn = async () => Foo1;

class MyClass {
    async asyncMethod() {
        return Foo1;
    }
}

const MyObject = {
    async asyncMethod() {
        return Foo1;
    }
};

async function deepNested() {
    Foo1;
    async function deepNested2() {
        Bar1;
    }
}
