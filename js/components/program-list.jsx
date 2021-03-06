import Preact from "preact";

import Program from "./program"
import { PageSection } from "./home"

import Api from "../util/wrapper"

const sorts = [
    "new",
    "top",
    "artistic",
    "entertaining",
    "informative"
];

window.cachedProgramLists = {};
for (let sort of sorts) {
    cachedProgramLists[sort] = [];
    cachedProgramLists[sort].complete = false; //Set the complete key on the array
}

export default class ProgramList extends Preact.Component {
    constructor (props) {
        super(props);

        this.api = new Api();
        this.baseUrl = props.baseUrl ? props.baseUrl : "/api/programs/";
        this.title = props.title;
        this.shouldUpdateURL = props.shouldUpdateURL;
        this.shouldShowAuthorName = props.shouldShowAuthorName; //This gets passed through to Program, where it defaults to true

        this.state.numCols = 4;

        this.state.sort = props.listOptions.sort;
        this.state.programList = props.listOptions.initialPrograms;
        this.perPage = props.listOptions.perPage;
        cachedProgramLists[this.state.sort] = this.state.programList;

        if (this.state.programList.length === 0) {
            console.error("Just loaded with no programs. This shouldn't happen.");
            this.loadMorePrograms();
        }

        if (this.state.programList.length <= this.perPage) {
            this.state.programList.complete = true;
        }
        //hasShowMoreButton should always be the opposite of whether the current programList this.state.programList is complete
        this.state.hasShowMoreButton = !this.state.programList.complete;
    }

    loadMorePrograms (newSort) {
        const sort = typeof newSort === "string" ? newSort : this.state.sort;

        const programList = cachedProgramLists[sort];

        this.api.getPrograms(this.baseUrl + sort, programList.length, this.perPage).then(newPrograms => {
            programList.push(...newPrograms);

            if (newPrograms.length < this.perPage) {
                this.setState({ "hasShowMoreButton": false });
                programList.complete = true;
            }

            this.setState({
                "programList": programList,
                "sort": sort
            });

            if (this.shouldUpdateURL && window.history.replaceState && window.location.pathname !== "/programs/" + sort) {
                window.history.replaceState({"sort": newSort}, document.title, "/programs/" + sort);
            }
        }).catch(err => {
            console.error(err);
            this.setState({ "sort": this.state.sort });
            alert("Unable to load programs. Is the internet connection online?");
        });
    }

    sortChange (e) {
        const newSort = e.target.value;

        /*
        The idea is that the cached list for the current sort and the current program list are always the same (===).

        programList needs to be changed if we have programs cached
        loadMostPrograms needs to be called IFF we don't have any programs cached
        */

        if (cachedProgramLists[newSort].length === 0) {
            this.loadMorePrograms(newSort);
        }else {
            this.setState({
                "sort": newSort,
                "programList": cachedProgramLists[newSort],
                "hasShowMoreButton": !cachedProgramLists[newSort].complete
            });

            if (this.shouldUpdateURL && window.history.replaceState && window.location.pathname !== "/programs/" + newSort) {
                window.history.replaceState({"sort": newSort}, document.title, "/programs/" + newSort);
            }
        }
    }

    render () {
        const programRows = [];


        //Ignore the last program (which we use to keep track of if we have more programs), if we haven't completed the current list
        let numPrograms = this.state.programList.length - (this.state.programList.complete ? 0 : 1);

        //Collect array into sub arrays of four (or numCols)
        for (let i = 0; i < numPrograms; i ++) {
            if (i % this.state.numCols === 0) {
                programRows.push([]);
            }
            programRows[programRows.length-1].push(this.state.programList[i]);
        }

        const sortSelector = (
            <select onChange={ this.sortChange.bind(this) } value={ this.state.sort }>{
                sorts.map(sort =>
                    <option value={sort}>{sort[0].toUpperCase() + sort.slice(1)}</option>
                )
            }</select>
        );

        return (
            <div id="program-list">
                <PageSection title={this.title} headerRight={sortSelector}>
                    <table className="program-list"><tbody>{
                        programRows.map(row => (
                            <tr>{
                                row.map(program => (
                                    <Program program={program} shouldShowAuthorName={this.shouldShowAuthorName}/>
                                ))
                            }</tr>
                        ))
                    }

                    {
                        this.state.hasShowMoreButton ?
                            (<tr>
                                <td></td>
                                <td colspan="2">
                                    <button className="more-programs-button" onClick={this.loadMorePrograms.bind(this)}>Show More Programs...</button>
                                </td>
                                <td></td>
                            </tr>) : null
                    }
                    </tbody></table>
                </PageSection>
            </div>
        );
    }
}
