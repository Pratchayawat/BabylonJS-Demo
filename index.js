// // JSX
// ReactDOM.render(<h1>Hello, React!</h1>, document.getElementById("root"));

// //
// ReactDOM.render(
//     <ul><li>list1</li><li>list2</li></ul>,
//     document.getElementById("root")
// );

// //
// ReactDOM.render(
//     <div>
//         <MainContent />
//         <MainContent />
//     </div>,
//     document.getElementById("root")
// );

// function MainContent () {
//     return (<h1>esadsad</h1>)
// }

// //
// const h1 = document.createElement("h1");
// h1.textContent = "Imperative way";
// h1.className = "header";
// document.getElementById("root").append(h1);
// //
// ReactDOM.render(<h1 className="header">Declarative way</h1>, document.getElementById("root"));

// ReactDOM.render(
//     <div>
//         <h1>This is JSX</h1>
//         <p>This is paragraph</p>
//     </div>,
//     document.getElementById("root")
// );

// JSX
// const page = ( 
//     <div>
//         <img src="./img/reacticon.png" width="40px" />
//         <h1>Fun facts about React</h1>
//         <ul>
//             <li>Was first release in 2013</li>
//             <li>Was originally created by Jordan Walke</li>
//             <li>Has well over 100k stars on GitHub</li>
//             <li>Is maintained by Facebook</li>
//             <li>Powered thousands of enterprise apps, including mobile appds</li>
//         </ul>
//     </div>
// );
// ReactDOM.render(page, document.getElementById("root"));

function TemporaryName() {
    return (
        <div>
            <img src="./img/reacticon.png" width="40px" />
            <h1>Fun facts about React</h1>
            <ul>
                <li>Was first release in 2013</li>
                <li>Was originally created by Jordan Walke</li>
                <li>Has well over 100k stars on GitHub</li>
                <li>Is maintained by Facebook</li>
                <li>Powered thousands of enterprise apps, including mobile appds</li>
            </ul>
        </div>
    )
}

ReactDOM.render(<TemporaryName />, document.getElementById("root"));

