import asyncDefault, {asyncSymbol} from 'asyncModule';

const x = async (x = 1 + asyncSymbol) => {
    asyncSymbol;
    asyncDefault;
};

const y = async function (x = 1 + asyncSymbol) {
    asyncSymbol;
    asyncDefault;
};

async function myFunction(x = 1 + asyncSymbol) {
    asyncSymbol;
    asyncDefault;
};

class MyClass {
    async myMethod(x = 1 + asyncSymbol) {
        asyncSymbol;        
        asyncDefault;
    }
}

const obj = {
    async myMethod(x = 1 + asyncSymbol) {
        asyncSymbol;
        asyncDefault;
    }
}
