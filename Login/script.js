const container = document.querySelector('.container');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');

registerBtn.addEventListener('click', () => {
    document.querySelector('.container').classList.add('active');
});

loginBtn.addEventListener('click', () => {
     document.querySelector('.container').classList.remove('active');
});
