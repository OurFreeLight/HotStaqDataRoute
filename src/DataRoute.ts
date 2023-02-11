import { HotRoute, HotDBMySQL, HotAPI, ConnectionStatus, 
	HotStaq, HotTestDriver, HotServerType, ServerRequest } from "hotstaq";

/**
 * Data route.
 */
export class DataRoute extends HotRoute
{
	/**
	 * The database connection.
	 */
	db: HotDBMySQL;

	/**
	 * @param api The API to attach this route to.
	 * @param onStartQueries The queries to execute when registering this route. This 
	 * would be executing any create if not exists tables, initial inserts, etc.
	 */
	constructor (api: HotAPI, onRegisteringRoute: ((db: HotDBMySQL) => Promise<void>) = null)
	{
		super (api.connection, "data");

		this.onRegister = async () =>
			{
				if (api.connection.type !== HotServerType.Generate)
				{
					this.db = (<HotDBMySQL>this.connection.api.db);

					if (this.db.connectionStatus !== ConnectionStatus.Connected)
						return (true);

					if (onRegisteringRoute != null)
						await onRegisteringRoute (this.db);
				}

				return (true);
			};

		this.addMethod ({
			"name": "add",
			"onServerExecute": this.add,
			"parameters": {
				"schema": {
					"type": "string",
					"required": true,
					"description": "The schema to add data to."
				},
				"fields": {
					"type": "string",
					"required": true,
					"description": 
						`The fields and their values to add to the database. A key/value object must be passed. Example: { "name": "Test_User" }`
				}
			},
			"description": "Add results to the database.",
			"returns": "Returns true if successful.",
			"testCases": [
				"addTest",
				async (driver: HotTestDriver): Promise<any> =>
				{
					// @ts-ignore
					let resp = await api.data.add ({
							"schema": "users",
							"fields": {
								"name": "Test_User",
								"email": "test@test.com"
							}
						});

					driver.assert (resp === true, "Unable to add item!");
				}
			]
		});
		this.addMethod ({
			"name": "edit",
			"onServerExecute": this.edit,
			"parameters": {
				"schema": {
					"type": "string",
					"required": true,
					"description": "The schema to edit data in."
				},
				"whereFields": {
					"type": "string",
					"required": true,
					"description": 
						`The where fields and their values to select from the database. A key/value object must be passed. Example: { "name": "Test_User" }`
				},
				"fields": {
					"type": "string",
					"required": true,
					"description": 
						`The fields and their values to update in the database. A key/value object must be passed. Example: { "name": "Test_User" }`
				}
			},
			"description": "Update the results in the database.",
			"returns": "Returns true if successful.",
			"testCases": [
				"editTest",
				async (driver: HotTestDriver): Promise<any> =>
				{
					// @ts-ignore
					let resp = await api.data.edit ({
							"schema": "users",
							"whereFields": {
								"name": "Test_User"
							},
							"fields": {
								"name": "Test_User_Updated",
								"email": "test_updated@test.com"
							}
						});

					driver.assert (resp === true, "Unable to edit item!");
				}
			]
		});
		this.addMethod ({
			"name": "remove",
			"onServerExecute": this.remove,
			"parameters": {
				"schema": {
					"type": "string",
					"required": true,
					"description": "The schema to remove data from."
				},
				"whereFields": {
					"type": "string",
					"required": true,
					"description": 
						`The where fields and their values to select from the database. A key/value object must be passed. Example: { "name": "Test_User" }`
				},
				"limit": {
					"type": "int",
					"required": false,
					"description": "The max number of results to delete."
				}
			},
			"description": "Remove results from the database.",
			"returns": "Returns true if successful.",
			"testCases": [
				"removeTest",
				async (driver: HotTestDriver): Promise<any> =>
				{
					// @ts-ignore
					let resp = await api.data.remove ({
							"schema": "users",
							"whereFields": {
								"name": "Test_User_Updated"
							}
						});

					driver.assert (resp === true, "Unable to remove item!");
					driver.persistentData.hasRemoved = true;
				}
			]
		});
		this.addMethod ({
			"name": "list",
			"onServerExecute": this.list,
			"parameters": {
				"schema": {
					"type": "string",
					"required": true,
					"description": "The schema to access."
				},
				"whereFields": {
					"type": "array",
					"required": false,
					"description": 
						`The where fields and their values to select from the database. A key/value object must be passed. Example: { "name": "Test_User" }`
				},
				"fields": {
					"type": "array",
					"required": true,
					"description": "The list of fields in the schema to access."
				},
				"offset": {
					"type": "int",
					"required": false,
					"description": "The offset."
				},
				"limit": {
					"type": "int",
					"required": false,
					"description": "The max number of results to return. Default is 20."
				}
			},
			"description": "List results from a schema.",
			"returns": "Returns the results from the schema.",
			"testCases": [
				"listTest",
				async (driver: HotTestDriver): Promise<any> =>
				{
					// @ts-ignore
					let resp = await api.data.list ({
							"schema": "users"
						});

					if (driver.persistentData.hasRemoved != null)
					{
						if (driver.persistentData.hasRemoved === true)
							driver.assert (resp.length === 0, "Not all items have been removed!");

						return;
					}

					const name: string = resp[0].name;
					driver.assert (name === "Test_User_Updated", "Unable to list items!");
				}
			]
		});
	}

	/**
	 * Add some data.
	 */
	protected async add (req: ServerRequest): Promise<any>
	{
		let schema: string = HotStaq.getParam ("schema", req.jsonObj);
		let fields: any = HotStaq.getParam ("fields", req.jsonObj);
		let insertQuery: string = "";
		let insertArray = [schema];

		for (let key in fields)
		{
			let field: string = key;
			let value: any = fields[key];

			insertQuery += `?? = ?, `;
			insertArray.push (key);
			insertArray.push (value);
		}

		if (insertArray.length > 1)
			insertQuery = insertQuery.substring (0, (insertQuery.length - 2));

		let result = await this.db.query (`insert into ?? set ${insertQuery};`, insertArray);

		if (result.error != null)
			throw new Error (result.error);

		return (true);
	}

	/**
	 * Edit some data.
	 */
	protected async edit (req: ServerRequest): Promise<any>
	{
		let schema: string = HotStaq.getParam ("schema", req.jsonObj);
		let whereFields: any = HotStaq.getParam ("whereFields", req.jsonObj);
		let fields: any = HotStaq.getParam ("fields", req.jsonObj);
		let updateQuery: string = "";
		let whereQuery: string = "";
		let updateArray = [schema];

		let addedUpdateArray: boolean = false;

		for (let key in fields)
		{
			let value: any = fields[key];

			updateQuery += `?? = ?, `;

			updateArray.push (key);
			updateArray.push (value);
			addedUpdateArray = true;
		}

		if (addedUpdateArray === true)
			updateQuery = updateQuery.substring (0, (updateQuery.length - 2));

		for (let key in whereFields)
		{
			let value: any = whereFields[key];

			whereQuery += `?? = ? AND `;
			updateArray.push (key);
			updateArray.push (value);
		}

		if (updateArray.length > 1)
			whereQuery = whereQuery.substring (0, (whereQuery.length - 5));

		let strtemp: string = this.db.db.format (`update ?? set ${updateQuery} where ${whereQuery};`, updateArray);
		let result = await this.db.query (strtemp, updateArray);

		if (result.error != null)
			throw new Error (result.error);

		return (true);
	}

	/**
	 * List some data.
	 */
	protected async list (req: ServerRequest): Promise<any>
	{
		let schema: string = HotStaq.getParam ("schema", req.jsonObj);
		let whereFields: any = HotStaq.getParamDefault ("whereFields", req.jsonObj, {});
		let offset: number = HotStaq.getParamDefault ("offset", req.jsonObj, null);
		let limit: number = HotStaq.getParamDefault ("limit", req.jsonObj, 20);

		let queryStr: string = "select * from ??";
		let values: any = [schema];

		const whereFieldsCount: number = Object.keys (whereFields).length;

		if (whereFieldsCount > 0)
			queryStr += " where ";

		for (let key in whereFields)
		{
			let fieldElement = whereFields[key];
			let value = fieldElement.value;

			queryStr += `?? = ? AND `;

			values.push (key);
			values.push (value);
		}

		if (values.length > 1)
			queryStr = queryStr.substring (0, (queryStr.length - 5));

		if (offset != null)
		{
			queryStr += ` offset ? `;
			values.push (offset);
		}

		if (limit != null)
		{
			queryStr += ` limit ? `;
			values.push (limit);
		}

		let result = await this.db.query (queryStr, values);

		if (result.error != null)
			throw result.error;

		this.logger.verbose (JSON.stringify (result));
		let results = result.results;

		return (results);
	}

	/**
	 * Remove some data.
	 */
	protected async remove (req: ServerRequest): Promise<any>
	{
		let schema: string = HotStaq.getParam ("schema", req.jsonObj);
		let whereFields: any = HotStaq.getParamDefault ("whereFields", req.jsonObj, {});
		let offset: number = HotStaq.getParamDefault ("offset", req.jsonObj, null);
		let limit: number = HotStaq.getParamDefault ("limit", req.jsonObj, 1);

		let queryStr: string = "delete from ??";
		let whereQuery: string = "";
		let values: any = [schema];

		const whereFieldsCount: number = Object.keys (whereFields).length;

		for (let key in whereFields)
		{
			let value: any = whereFields[key];

			whereQuery += `?? = ? AND `;

			values.push (key);
			values.push (value);
		}

		if (whereFieldsCount > 0)
			queryStr += " where " + whereQuery.substring (0, (whereQuery.length - 5));

		if (offset != null)
		{
			queryStr += ` offset ? `;
			values.push (offset);
		}

		if (limit != null)
		{
			queryStr += ` limit ? `;
			values.push (limit);
		}

		let strtemp: string = this.db.db.format (queryStr, values);
		let result = await this.db.query (queryStr, values);

		if (result.error != null)
			throw result.error;

		this.logger.verbose (JSON.stringify (result));
		let results = result.results;

		return (results);
	}
}